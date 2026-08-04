import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";

function getCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = candidate.getSetCookie?.() ?? [];
  return cookies.length > 0 ? cookies.map((cookie) => cookie.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const cookie = getCookie(response.headers);
  if (!response.ok || !cookie) {
    throw new Error(`Login do smoke de divisao retornou HTTP ${response.status}.`);
  }

  return cookie;
}

async function request(path: string, cookie: string, body: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();

  return {
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    status: response.status
  };
}

async function getPage(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
  const body = await response.text();

  if (!response.ok || body.includes("Application error") || body.includes("Server Error")) {
    throw new Error(`A tela ${path} falhou no smoke de divisao.`);
  }

  return body;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const orderNumber = `970000${Date.now()}`;
  let orderId = "";

  try {
    const openRegister = await db.cashRegister.findFirst({ where: { status: "OPEN" } });
    if (!openRegister) {
      throw new Error("Abra um caixa antes de executar o smoke de divisao parcial.");
    }

    const products = await db.product.findMany({
      where: { active: true, trackStock: false },
      orderBy: { sku: "asc" },
      take: 2
    });
    if (products.length < 2) {
      throw new Error("O smoke de divisao precisa de dois produtos ativos sem baixa de estoque.");
    }

    const order = await db.salesOrder.create({
      data: {
        number: orderNumber,
        channel: "TAB",
        status: "OPEN",
        subtotal: 30,
        total: 30,
        items: {
          create: [
            {
              productId: products[0].id,
              quantity: 1,
              unitPrice: 10,
              totalPrice: 10
            },
            {
              productId: products[1].id,
              quantity: 1,
              unitPrice: 20,
              totalPrice: 20
            }
          ]
        }
      },
      include: { items: true }
    });
    orderId = order.id;

    const cookie = await login();
    const page = await getPage(`/operacao/caixa?busca=${orderNumber}`, cookie);
    assert(page.includes("Dividir por itens"), "A tela de caixa nao exibiu divisao por itens.");
    assert(page.includes("Dividir por pessoas"), "A tela de caixa nao exibiu divisao por pessoas.");

    const firstPayment = await request("/api/operations/payments", cookie, {
      salesOrderId: order.id,
      payments: [{ method: "PIX", amount: 10 }],
      allocations: [{ salesOrderItemId: order.items[0].id, amount: 10 }]
    });
    assert(firstPayment.status === 201, `Primeiro pagamento retornou HTTP ${firstPayment.status}.`);
    assert(firstPayment.body.fullyPaid === false, "A primeira parte nao deveria quitar a comanda.");
    assert(Number(firstPayment.body.remaining) === 20, "O saldo restante da primeira parte ficou incorreto.");

    const firstAllocation = await db.paymentAllocation.findFirst({
      where: { salesOrderItemId: order.items[0].id },
      select: { amount: true }
    });
    assert(Number(firstAllocation?.amount) === 10, "A baixa do primeiro item nao foi persistida.");

    const invalidPayment = await request("/api/operations/payments", cookie, {
      salesOrderId: order.id,
      payments: [{ method: "CASH", amount: 10 }],
      allocations: [{ salesOrderItemId: order.items[0].id, amount: 10 }]
    });
    assert(invalidPayment.status === 400, "O backend permitiu pagar novamente um item ja quitado.");

    const secondPayment = await request("/api/operations/payments", cookie, {
      salesOrderId: order.id,
      payments: [
        { method: "CASH", amount: 10 },
        { method: "PIX", amount: 10 }
      ],
      allocations: [{ salesOrderItemId: order.items[1].id, amount: 20 }]
    });
    assert(secondPayment.status === 201, `Divisao por pessoas/formas retornou HTTP ${secondPayment.status}.`);
    assert(secondPayment.body.fullyPaid === true, "A segunda parte deveria quitar a comanda.");

    const finalOrder = await db.salesOrder.findUnique({
      where: { id: order.id },
      include: { payments: { include: { allocations: true } }, items: true }
    });
    const allocationsCount = finalOrder?.payments.flatMap((payment) => payment.allocations).length ?? 0;
    assert(finalOrder?.status === "PAID", "A comanda nao foi marcada como paga.");
    assert(allocationsCount === 3, "O rateio dos pagamentos por item ficou incompleto.");

    console.log("Divisao parcial aprovada: item, valor, pessoas e formas de pagamento.");
  } finally {
    if (orderId) {
      await db.accountReceivable.deleteMany({ where: { salesOrderId: orderId } });
      await db.salesOrder.delete({ where: { id: orderId } });
    }
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
