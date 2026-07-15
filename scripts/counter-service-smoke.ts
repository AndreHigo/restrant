import { db } from "../src/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";

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

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Login falhou no smoke de balcao: HTTP ${response.status}.`);
  }

  const cookie = createCookieHeader(getSetCookie(response.headers));

  if (!cookie) {
    throw new Error("Login nao retornou cookie no smoke de balcao.");
  }

  return cookie;
}

async function postOrder(cookie: string, productId: string) {
  const response = await fetch(`${baseUrl}/api/operations/orders`, {
    body: JSON.stringify({
      channel: "COUNTER",
      notes: "Smoke de atendimento rapido de balcao",
      items: [
        {
          productId,
          quantity: 1,
          notes: "Marmita teste balcao"
        }
      ]
    }),
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    method: "POST"
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Pedido de balcao falhou: HTTP ${response.status}. ${body.slice(0, 300)}`);
  }

  return JSON.parse(body) as { id: string; number: string };
}

async function main() {
  const product = await db.product.findFirst({
    where: {
      active: true,
      sendToProduction: true,
      productionSectorId: {
        not: null
      },
      type: {
        not: "WEIGHABLE"
      }
    },
    include: {
      productionSector: true
    },
    orderBy: {
      name: "asc"
    }
  });

  if (!product) {
    throw new Error("Nenhum produto unitario com setor de producao encontrado para testar balcao.");
  }

  const cookie = await login();
  const order = await postOrder(cookie, product.id);
  const productionItem = await db.productionItem.findFirst({
    where: {
      salesOrderItem: {
        salesOrderId: order.id,
        productId: product.id
      }
    },
    include: {
      productionSector: true
    }
  });

  if (!productionItem) {
    throw new Error("Pedido de balcao nao gerou item de producao.");
  }

  const counterPage = await fetch(`${baseUrl}/operacao/balcao`, {
    headers: {
      cookie
    }
  });
  const counterBody = await counterPage.text();

  if (!counterPage.ok || !counterBody.includes("Atendimento rapido de balcao")) {
    throw new Error("Tela de balcao nao renderizou corretamente.");
  }

  console.log(
    `Atendimento rapido aprovado: pedido ${order.number}, produto ${product.name}, setor ${productionItem.productionSector.name}.`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
