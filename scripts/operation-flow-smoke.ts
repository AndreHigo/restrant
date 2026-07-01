import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";
const qaPrefix = "900";

type FlowResult = {
  step: string;
  ok: boolean;
  detail: string;
};

function getSetCookie(headers: Headers) {
  const anyHeaders = headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (anyHeaders.getSetCookie) {
    return anyHeaders.getSetCookie();
  }

  const rawCookies = anyHeaders.raw?.()["set-cookie"];

  if (rawCookies) {
    return rawCookies;
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function createCookieHeader(setCookies: string[]) {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function requestJson<TPayload extends object, TResponse>(
  path: string,
  cookieHeader: string,
  payload: TPayload
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader
    },
    body: JSON.stringify(payload)
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path} retornou HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  return JSON.parse(body) as TResponse;
}

async function getPage(path: string, cookieHeader: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      cookie: cookieHeader
    }
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path} retornou HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  if (body.includes("Server Error") || body.includes("Application error") || body.includes("Cannot find module")) {
    throw new Error(`${path} renderizou erro de aplicacao.`);
  }

  return body;
}

function assertIncludes(body: string, expected: string, context: string) {
  if (!body.includes(expected)) {
    throw new Error(`${context} nao encontrou "${expected}".`);
  }
}

async function cleanupQaData() {
  const orders = await db.salesOrder.findMany({
    where: {
      tab: {
        number: {
          startsWith: qaPrefix
        }
      }
    },
    select: {
      id: true
    }
  });

  if (orders.length > 0) {
    await db.salesOrder.updateMany({
      where: {
        id: {
          in: orders.map((order) => order.id)
        },
        status: {
          notIn: ["PAID", "CANCELED"]
        }
      },
      data: {
        status: "CANCELED",
        closedAt: new Date()
      }
    });
  }

  await db.tab.updateMany({
    where: {
      number: {
        startsWith: qaPrefix
      }
    },
    data: {
      active: false
    }
  });
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual"
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Login retornou HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const cookieHeader = createCookieHeader(getSetCookie(response.headers));

  if (!cookieHeader) {
    throw new Error("Login nao retornou cookie de sessao.");
  }

  return cookieHeader;
}

async function main() {
  const results: FlowResult[] = [];
  const tabCode = `${qaPrefix}${new Date().toISOString().replace(/\D/g, "").slice(8, 14)}`;

  await cleanupQaData();

  try {
    const cookieHeader = await login();
    results.push({ step: "login", ok: true, detail: "sessao autenticada" });

    const [readyProduct, weighableProduct] = await Promise.all([
      db.product.findFirst({ where: { active: true, type: "READY" }, orderBy: { sku: "asc" } }),
      db.product.findFirst({ where: { active: true, type: "WEIGHABLE" }, orderBy: { sku: "asc" } })
    ]);

    if (!readyProduct) {
      throw new Error("Nenhum produto READY ativo encontrado para o fluxo QA.");
    }

    if (!weighableProduct) {
      throw new Error("Nenhum produto WEIGHABLE ativo encontrado para o fluxo QA.");
    }

    const order = await requestJson<
      object,
      { id: string; number: string; total: string | number; appendedToExistingOrder: boolean }
    >("/api/operations/orders", cookieHeader, {
      channel: "TAB",
      tabCode,
      notes: "QA fluxo operacional - atendimento",
      items: [
        {
          productId: readyProduct.id,
          quantity: 1,
          notes: "QA atendimento"
        }
      ]
    });
    results.push({ step: "pedido", ok: true, detail: `${order.number} criado na comanda ${tabCode}` });

    const scaleLaunch = await requestJson<
      object,
      {
        orderId: string;
        orderNumber: string;
        appendedToExistingOrder: boolean;
        reading: { weightKg: number; totalPrice: number };
      }
    >("/api/operations/scale/launch", cookieHeader, {
      productId: weighableProduct.id,
      targetType: "TAB",
      targetCode: tabCode,
      weightKg: 0.575,
      sourceMode: "MANUAL",
      notes: "QA fluxo operacional - balanca"
    });

    if (scaleLaunch.orderId !== order.id || !scaleLaunch.appendedToExistingOrder) {
      throw new Error("Lancamento da balanca nao alimentou a mesma comanda/pedido aberto.");
    }

    results.push({
      step: "balanca",
      ok: true,
      detail: `${scaleLaunch.reading.weightKg} kg lancado no pedido ${scaleLaunch.orderNumber}`
    });

    const tabPage = await getPage(`/operacao/comandas?numero=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(tabPage, tabCode, "Tela de comandas");
    assertIncludes(tabPage, readyProduct.name, "Tela de comandas");
    assertIncludes(tabPage, weighableProduct.name, "Tela de comandas");
    results.push({ step: "comandas", ok: true, detail: "comanda renderizou item comum e item pesado" });

    const waiterPage = await getPage(`/operacao/garcom?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(waiterPage, tabCode, "Tela do garcom");
    assertIncludes(waiterPage, readyProduct.name, "Tela do garcom");
    assertIncludes(waiterPage, weighableProduct.name, "Tela do garcom");
    assertIncludes(waiterPage, "Adicionar item na comanda", "Tela do garcom");
    results.push({ step: "garcom", ok: true, detail: "garcom consultou e continuou a comanda na mesma tela" });

    const cashPage = await getPage(`/operacao/caixa?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(cashPage, order.number, "Tela de caixa");
    assertIncludes(cashPage, "Ver recibo", "Tela de caixa");
    results.push({ step: "caixa", ok: true, detail: "caixa encontrou a comanda numerica" });

    const receiptPage = await getPage(`/operacao/recibos/${order.id}`, cookieHeader);
    assertIncludes(receiptPage, "Recibo do pedido", "Recibo");
    assertIncludes(receiptPage, readyProduct.name, "Recibo");
    assertIncludes(receiptPage, weighableProduct.name, "Recibo");
    assertIncludes(receiptPage, "Documento nao fiscal", "Recibo");
    results.push({ step: "recibo", ok: true, detail: "recibo renderizou os itens da comanda" });

    await requestJson<object, { id: string; status: string }>("/api/operations/orders/status", cookieHeader, {
      salesOrderId: order.id,
      status: "CANCELED",
      cancelReason: "Limpeza do smoke test de fluxo operacional"
    });
    results.push({ step: "cancelamento", ok: true, detail: "pedido de teste cancelado" });

    console.table(results);
    console.log(`Fluxo operacional aprovado em ${baseUrl} usando comanda ${tabCode}`);
  } finally {
    await cleanupQaData();
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await db.$disconnect();
  process.exit(1);
});
