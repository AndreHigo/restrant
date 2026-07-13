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
  const tabCode = `${qaPrefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const targetTabCode = `${tabCode}1`;

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

    const readyOrderItem = await db.salesOrderItem.findFirst({
      where: {
        salesOrderId: order.id,
        productId: readyProduct.id
      },
      select: {
        id: true
      }
    });

    if (!readyOrderItem) {
      throw new Error("Item comum nao encontrado para edicao.");
    }

    await requestJson<object, { item: { id: string } }>("/api/operations/orders/items/update", cookieHeader, {
      salesOrderItemId: readyOrderItem.id,
      quantity: 2,
      discount: 1.5,
      notes: "QA quantidade editada",
      reason: "Correcao de quantidade no teste operacional"
    });

    const discountedItem = await db.salesOrderItem.findUnique({
      where: {
        id: readyOrderItem.id
      },
      select: {
        discount: true,
        totalPrice: true,
        unitPrice: true,
        quantity: true
      }
    });

    if (!discountedItem || Number(discountedItem.discount) !== 1.5) {
      throw new Error("Desconto por item nao foi persistido.");
    }

    const expectedDiscountedTotal = Number(discountedItem.unitPrice) * Number(discountedItem.quantity) - 1.5;

    if (Number(discountedItem.totalPrice) !== expectedDiscountedTotal) {
      throw new Error("Total do item com desconto foi calculado incorretamente.");
    }

    results.push({ step: "edicao-item", ok: true, detail: "item comum editado para 2 unidades com desconto" });

    await requestJson<
      object,
      { id: string; number: string; total: string | number; appendedToExistingOrder: boolean }
    >("/api/operations/orders", cookieHeader, {
      channel: "TAB",
      tabCode,
      notes: "QA fluxo operacional - item para transferencia",
      items: [
        {
          productId: readyProduct.id,
          quantity: 1,
          notes: "QA item para transferir"
        }
      ]
    });

    const transferableItem = await db.salesOrderItem.findFirst({
      where: {
        salesOrderId: order.id,
        notes: "QA item para transferir"
      },
      select: {
        id: true
      }
    });

    if (!transferableItem) {
      throw new Error("Item comum nao encontrado para transferencia.");
    }

    await requestJson<object, { itemId: string }>("/api/operations/orders/items/transfer", cookieHeader, {
      salesOrderItemId: transferableItem.id,
      targetTabCode,
      reason: "Correcao de comanda no teste operacional"
    });
    results.push({ step: "transferencia", ok: true, detail: `item transferido para comanda ${targetTabCode}` });

    const productionItem = await db.productionItem.findFirst({
      where: {
        salesOrderItem: {
          salesOrderId: order.id,
          productId: readyProduct.id
        }
      },
      include: {
        productionSector: true
      }
    });

    if (!productionItem) {
      throw new Error("Item de producao nao foi criado para o produto do pedido.");
    }

    const productionPage = await getPage("/operacao/producao", cookieHeader);
    assertIncludes(productionPage, readyProduct.name, "Tela de producao");
    assertIncludes(productionPage, productionItem.productionSector.name, "Tela de producao");

    const ordersPage = await getPage(`/operacao/pedidos?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(ordersPage, "PDV rapido", "Tela de pedidos");
    assertIncludes(ordersPage, "Lancamento por codigo", "Tela de pedidos");

    await requestJson<object, { id: string }>("/api/operations/production/status", cookieHeader, {
      productionItemId: productionItem.id,
      status: "PREPARING"
    });
    await requestJson<object, { id: string }>("/api/operations/production/status", cookieHeader, {
      productionItemId: productionItem.id,
      status: "READY"
    });
    results.push({
      step: "producao",
      ok: true,
      detail: `${readyProduct.name} enviado para ${productionItem.productionSector.name}`
    });

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

    const weighableOrderItem = await db.salesOrderItem.findFirst({
      where: {
        salesOrderId: order.id,
        productId: weighableProduct.id
      },
      select: {
        id: true
      }
    });

    if (!weighableOrderItem) {
      throw new Error("Item pesado nao encontrado para ajuste manual.");
    }

    await requestJson<object, { id: string }>("/api/operations/orders/items/weight", cookieHeader, {
      salesOrderItemId: weighableOrderItem.id,
      weightKg: 0.6,
      reason: "Correcao manual do peso no teste operacional"
    });

    results.push({
      step: "ajuste-peso",
      ok: true,
      detail: "item pesado ajustado manualmente para 0.600 kg"
    });

    const tabPage = await getPage(`/operacao/comandas?numero=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(tabPage, tabCode, "Tela de comandas");
    assertIncludes(tabPage, readyProduct.name, "Tela de comandas");
    assertIncludes(tabPage, "QA quantidade editada", "Tela de comandas");
    assertIncludes(tabPage, weighableProduct.name, "Tela de comandas");
    assertIncludes(tabPage, "0,600 kg", "Tela de comandas");
    results.push({ step: "comandas", ok: true, detail: "comanda renderizou item comum e item pesado" });

    const targetTabPage = await getPage(`/operacao/comandas?numero=${encodeURIComponent(targetTabCode)}`, cookieHeader);
    assertIncludes(targetTabPage, targetTabCode, "Comanda destino");
    assertIncludes(targetTabPage, readyProduct.name, "Comanda destino");
    assertIncludes(targetTabPage, "QA item para transferir", "Comanda destino");
    results.push({ step: "comanda-destino", ok: true, detail: "comanda destino recebeu item transferido" });

    await requestJson<object, { ordersMoved: number; targetTabCode: string }>("/api/operations/tabs/merge", cookieHeader, {
      sourceTabCode: targetTabCode,
      targetTabCode: tabCode,
      reason: "Uniao de comandas no teste operacional"
    });
    const mergedTabPage = await getPage(`/operacao/comandas?numero=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(mergedTabPage, tabCode, "Comanda unida");
    assertIncludes(mergedTabPage, "QA item para transferir", "Comanda unida");
    results.push({ step: "uniao-comandas", ok: true, detail: `comanda ${targetTabCode} unida na ${tabCode}` });

    const waiterPage = await getPage(`/operacao/garcom?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(waiterPage, tabCode, "Tela do garcom");
    assertIncludes(waiterPage, readyProduct.name, "Tela do garcom");
    assertIncludes(waiterPage, weighableProduct.name, "Tela do garcom");
    assertIncludes(waiterPage, "0,600 kg", "Tela do garcom");
    assertIncludes(waiterPage, "Lancamento rapido por codigo", "Tela do garcom");
    results.push({ step: "garcom", ok: true, detail: "garcom consultou e lancou item sem sair da comanda" });

    const cashPage = await getPage(`/operacao/caixa?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(cashPage, order.number, "Tela de caixa");
    assertIncludes(cashPage, "Ver recibo", "Tela de caixa");
    results.push({ step: "caixa", ok: true, detail: "caixa encontrou a comanda numerica" });

    const paymentResult = await requestJson<
      object,
      { payments: Array<{ id: string; status: string; amount: string | number }> }
    >("/api/operations/payments", cookieHeader, {
      salesOrderId: order.id,
      payments: [
        {
          method: "PIX",
          amount: 1
        }
      ]
    });
    const paidPayment = paymentResult.payments[0];

    if (!paidPayment?.id) {
      throw new Error("Pagamento de teste nao retornou identificador.");
    }

    const cashPageWithPayment = await getPage(`/operacao/caixa?comanda=${encodeURIComponent(tabCode)}`, cookieHeader);
    assertIncludes(cashPageWithPayment, "Estornar", "Tela de caixa com pagamento");

    await requestJson<object, { payment: { id: string; status: string }; remaining: number }>(
      "/api/operations/payments/refund",
      cookieHeader,
      {
        paymentId: paidPayment.id,
        reason: "Estorno auditado no smoke test operacional"
      }
    );

    const refundedPayment = await db.payment.findUnique({
      where: {
        id: paidPayment.id
      },
      select: {
        status: true
      }
    });

    if (refundedPayment?.status !== "REFUNDED") {
      throw new Error("Pagamento de teste nao ficou com status estornado.");
    }

    results.push({ step: "estorno", ok: true, detail: "pagamento parcial estornado com auditoria" });

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
