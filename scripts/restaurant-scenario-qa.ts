import { PrismaClient, PaymentMethodType } from "@prisma/client";
import { hashSync } from "bcryptjs";

const db = new PrismaClient();
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const scenarioCode = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const scenarioTag = `Cenario ${scenarioCode}`;
const password = "Teste@123";

type Actor = {
  email: string;
  name: string;
  role: "administrador" | "atendente";
};

type ScenarioOrder = {
  attendant: Actor;
  amount: number;
  items: string[];
  number: string;
  orderId: string;
  paid: boolean;
  table: string;
  tab: string;
};

const wesley: Actor = {
  email: "wesley",
  name: "Wesley",
  role: "administrador"
};

const attendants: Actor[] = [
  { email: "garcom-01", name: "Garcom 01", role: "atendente" },
  { email: "garcom-02", name: "Garcom 02", role: "atendente" },
  { email: "garcom-03", name: "Garcom 03", role: "atendente" }
];

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

async function login(actor: Actor) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email: actor.email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    redirect: "manual"
  });

  if (!response.ok) {
    throw new Error(`Login de ${actor.name} falhou com HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const cookie = createCookieHeader(getSetCookie(response.headers));

  if (!cookie) {
    throw new Error(`Login de ${actor.name} nao retornou cookie.`);
  }

  return cookie;
}

async function postJson<TPayload extends object, TResponse>(path: string, cookie: string, payload: TPayload) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    method: "POST"
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path} retornou HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  return JSON.parse(body) as TResponse;
}

async function getPage(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie }
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

async function ensureRole(name: Actor["role"]) {
  return db.role.findUniqueOrThrow({ where: { name } });
}

async function ensureUser(actor: Actor) {
  const role = await ensureRole(actor.role);

  return db.user.upsert({
    where: { email: actor.email },
    create: {
      email: actor.email,
      mustResetPassword: false,
      name: actor.name,
      passwordHash: hashSync(password, 10),
      roleId: role.id,
      status: "ACTIVE"
    },
    update: {
      mustResetPassword: false,
      name: actor.name,
      passwordHash: hashSync(password, 10),
      roleId: role.id,
      status: "ACTIVE"
    }
  });
}

async function ensureTables() {
  const tables = [];

  for (let index = 1; index <= 20; index++) {
    const code = String(index);
    const table = await db.restaurantTable.upsert({
      where: { code },
      create: {
        active: true,
        code,
        name: `Mesa ${String(index).padStart(2, "0")}`,
        seats: index <= 8 ? 2 : index <= 16 ? 4 : 6
      },
      update: {
        active: true,
        seats: index <= 8 ? 2 : index <= 16 ? 4 : 6
      }
    });
    tables.push(table);
  }

  return tables;
}

async function ensureProducts() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { sku: "asc" }
  });
  const readyProducts = products.filter((product) => product.type === "READY");
  const weighableProduct = products.find((product) => product.type === "WEIGHABLE");

  if (readyProducts.length < 2 || !weighableProduct) {
    throw new Error("Cenario precisa de ao menos 2 produtos prontos e 1 produto por quilo ativo.");
  }

  return {
    buffet: weighableProduct,
    ready: readyProducts
  };
}

async function ensureOpenCashRegister(wesleyCookie: string) {
  const current = await db.cashRegister.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" }
  });

  if (current) {
    return { code: current.code, id: current.id, reused: true };
  }

  const register = await postJson<object, { id: string; code: string }>("/api/operations/cash-register/open", wesleyCookie, {
    openingAmount: 250,
    notes: `${scenarioTag} - abertura feita por Wesley`
  });

  return { code: register.code, id: register.id, reused: false };
}

async function simulateOrder(params: {
  attendant: Actor;
  cookie: string;
  productId: string;
  quantity: number;
  table: string;
  tab: string;
}) {
  return postJson<
    object,
    { id: string; number: string; total: string | number; appendedToExistingOrder: boolean }
  >("/api/operations/orders", params.cookie, {
    channel: "TAB",
    notes: `${scenarioTag} - ${params.attendant.name} atendendo ${params.table}`,
    tabCode: params.tab,
    items: [
      {
        productId: params.productId,
        quantity: params.quantity,
        notes: `${params.table} - lancado por ${params.attendant.name}`
      }
    ]
  });
}

async function simulateBuffet(params: {
  attendant: Actor;
  cookie: string;
  productId: string;
  table: string;
  tab: string;
  weightKg: number;
}) {
  return postJson<
    object,
    {
      orderId: string;
      orderNumber: string;
      reading: { weightKg: number; totalPrice: number };
    }
  >("/api/operations/scale/launch", params.cookie, {
    productId: params.productId,
    sourceMode: "MANUAL",
    targetCode: params.tab,
    targetType: "TAB",
    weightKg: params.weightKg,
    notes: `${scenarioTag} - buffet ${params.table} lancado por ${params.attendant.name}`
  });
}

async function payOrder(cookie: string, salesOrderId: string, amount: number, method: PaymentMethodType) {
  return postJson<object, { fullyPaid: boolean; remaining: number }>("/api/operations/payments", cookie, {
    salesOrderId,
    payments: [{ amount, method }]
  });
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

async function main() {
  const startedAt = new Date();
  const actors = [wesley, ...attendants];
  const createdUsers = await Promise.all(actors.map(ensureUser));
  const userByEmail = new Map(createdUsers.map((user) => [user.email, user]));
  const tables = await ensureTables();
  const products = await ensureProducts();

  const cookies = new Map<string, string>();

  for (const actor of actors) {
    cookies.set(actor.email, await login(actor));
  }

  const wesleyCookie = cookies.get(wesley.email);

  if (!wesleyCookie) {
    throw new Error("Sessao do Wesley nao foi criada.");
  }

  const register = await ensureOpenCashRegister(wesleyCookie);

  const orders: ScenarioOrder[] = [];
  const tabCodes: string[] = [];

  for (let index = 0; index < tables.length; index++) {
    const attendant = attendants[index % attendants.length];
    const attendantCookie = cookies.get(attendant.email);

    if (!attendantCookie) {
      throw new Error(`Sessao do ${attendant.name} nao foi criada.`);
    }

    const table = tables[index];
    const tab = `${scenarioCode}${String(index + 1).padStart(2, "0")}`;
    tabCodes.push(tab);
    const readyProduct = products.ready[index % products.ready.length];
    const quantity = index % 4 === 0 ? 2 : 1;
    const order = await simulateOrder({
      attendant,
      cookie: attendantCookie,
      productId: readyProduct.id,
      quantity,
      table: table.code,
      tab
    });
    const itemNames = [`${readyProduct.sku} ${readyProduct.name} x${quantity}`];

    let orderId = order.id;
    let amount = Number(order.total);

    if (index % 3 === 0) {
      const weightKg = Number((0.42 + index * 0.011).toFixed(3));
      const buffet = await simulateBuffet({
        attendant,
        cookie: attendantCookie,
        productId: products.buffet.id,
        table: table.code,
        tab,
        weightKg
      });
      orderId = buffet.orderId;
      amount = Number((amount + buffet.reading.totalPrice).toFixed(2));
      itemNames.push(`${products.buffet.sku} ${products.buffet.name} ${weightKg.toFixed(3)}kg`);
    }

    const paid = index < 8;
    if (paid) {
      const method: PaymentMethodType = index % 2 === 0 ? "PIX" : "CASH";
      await payOrder(wesleyCookie, orderId, amount, method);
    }

    orders.push({
      amount,
      attendant,
      items: itemNames,
      number: order.number,
      orderId,
      paid,
      table: table.code,
      tab
    });
  }

  const auditUsers = [wesley.email, ...attendants.map((attendant) => attendant.email)];
  const auditLogs = await db.auditLog.findMany({
    where: {
      createdAt: { gte: startedAt },
      user: { email: { in: auditUsers } }
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 250
  });
  const actionSummary = auditLogs.reduce<Record<string, Record<string, number>>>((summary, log) => {
    const name = log.user?.name ?? "Sistema";
    summary[name] ??= {};
    summary[name][log.action] = (summary[name][log.action] ?? 0) + 1;
    return summary;
  }, {});
  const openTabs = await db.tab.count({
    where: {
      number: { in: tabCodes },
      orders: { some: { status: { in: ["OPEN", "PREPARING", "READY", "DELIVERED"] } } }
    }
  });
  const paidOrders = orders.filter((order) => order.paid);
  const pendingOrders = orders.filter((order) => !order.paid);
  const totalSold = orders.reduce((sum, order) => sum + order.amount, 0);
  const paidTotal = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  const pendingTotal = pendingOrders.reduce((sum, order) => sum + order.amount, 0);

  await Promise.all([
    getPage("/admin", wesleyCookie),
    getPage("/admin/auditoria", wesleyCookie),
    getPage("/operacao", wesleyCookie),
    getPage(`/operacao/garcom?comanda=${tabCodes[0]}`, cookies.get(attendants[0].email) ?? ""),
    getPage(`/operacao/caixa?comanda=${tabCodes[0]}`, wesleyCookie),
    getPage("/admin/relatorios/vendas", wesleyCookie),
    getPage("/admin/relatorios/financeiro", wesleyCookie)
  ]);

  console.log("\nRELATORIO DE SIMULACAO - RESTAURANTE");
  console.log(`Cenario: ${scenarioTag}`);
  console.log(`URL testada: ${baseUrl}`);
  console.log(`Administrador/caixa: ${wesley.name} (${wesley.email})`);
  console.log(`Garcons: ${attendants.map((attendant) => attendant.name).join(", ")}`);
  console.log(`Mesas preparadas: ${tables.length}`);
  console.log(`Caixa: ${register.reused ? "caixa ja estava aberto" : "aberto pelo Wesley"} (${register.code})`);
  console.log(`Pedidos simulados: ${orders.length}`);
  console.log(`Pedidos pagos pelo Wesley: ${paidOrders.length}`);
  console.log(`Pedidos pendentes em comandas abertas: ${pendingOrders.length}`);
  console.log(`Comandas do cenario abertas no painel: ${openTabs}`);
  console.log(`Total vendido simulado: ${money(totalSold)}`);
  console.log(`Total recebido no caixa: ${money(paidTotal)}`);
  console.log(`Saldo pendente em comandas: ${money(pendingTotal)}`);

  console.log("\nDistribuicao por garcom:");
  console.table(
    attendants.map((attendant) => {
      const attendantOrders = orders.filter((order) => order.attendant.email === attendant.email);
      return {
        garcom: attendant.name,
        mesas: attendantOrders.map((order) => order.table).join(", "),
        pedidos: attendantOrders.length,
        total: money(attendantOrders.reduce((sum, order) => sum + order.amount, 0))
      };
    })
  );

  console.log("\nAmostra de pedidos:");
  console.table(
    orders.slice(0, 10).map((order) => ({
      mesa: order.table,
      comanda: order.tab,
      garcom: order.attendant.name,
      itens: order.items.join(" | "),
      pago: order.paid ? "sim" : "nao",
      total: money(order.amount)
    }))
  );

  console.log("\nAuditoria por usuario e acao:");
  console.table(actionSummary);

  console.log("\nTelas verificadas: admin, auditoria, operacional, garcom, caixa, relatorio de vendas e financeiro.");
  console.log("Resultado: simulacao concluida sem erro de API ou renderizacao.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
