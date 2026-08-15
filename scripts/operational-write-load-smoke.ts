import { db } from "@/lib/db";

export {};

type Timing = {
  durationMs: number;
  operation: string;
};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";
const workers = Math.min(6, Math.max(1, Number(process.env.WRITE_LOAD_WORKERS ?? 3)));
const rounds = Math.min(5, Math.max(1, Number(process.env.WRITE_LOAD_ROUNDS ?? 2)));
const tabPrefix = `8800${Date.now()}`;

function getCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = candidate.getSetCookie?.() ?? [];
  return cookies.length > 0 ? cookies.map((cookie) => cookie.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const cookie = getCookie(response.headers);

  if (!response.ok || !cookie) {
    throw new Error(`Login da carga de escrita retornou HTTP ${response.status}.`);
  }

  return cookie;
}

async function postJson(path: string, cookie: string, body: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new Error(`${path} retornou HTTP ${response.status}: ${String(payload.error ?? text).slice(0, 240)}`);
  }

  return payload;
}

function percentile(values: number[], percentage: number) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil((percentage / 100) * ordered.length) - 1);
  return ordered[Math.max(0, index)] ?? 0;
}

async function cleanup() {
  const tabs = await db.tab.findMany({
    where: { number: { startsWith: tabPrefix } },
    select: { id: true }
  });
  const tabIds = tabs.map((tab) => tab.id);

  if (tabIds.length > 0) {
    await db.salesOrder.deleteMany({ where: { tabId: { in: tabIds } } });
    await db.tab.deleteMany({ where: { id: { in: tabIds } } });
  }
}

async function main() {
  const product = await db.product.findFirst({
    where: {
      active: true,
      trackStock: false,
      type: { not: "WEIGHABLE" },
      price: { gt: 0 }
    },
    orderBy: { sku: "asc" }
  });
  const openRegister = await db.cashRegister.findFirst({ where: { status: "OPEN" } });

  if (!product) {
    throw new Error("Nenhum produto sem baixa de estoque foi encontrado para a carga de escrita.");
  }

  if (!openRegister) {
    throw new Error("Abra um caixa antes da carga de escrita.");
  }

  const timings: Timing[] = [];
  const errors: string[] = [];

  try {
    const cookie = await login();
    const workerResults = await Promise.allSettled(
      Array.from({ length: workers }, async (_, workerIndex) => {
        for (let round = 0; round < rounds; round += 1) {
          const tabCode = `${tabPrefix}${workerIndex + 1}${round + 1}`;
          const orderStartedAt = performance.now();
          const order = await postJson("/api/operations/orders", cookie, {
            channel: "TAB",
            tabCode,
            notes: "Carga leve de escrita",
            items: [{ productId: product.id, quantity: 1 }]
          });
          timings.push({ durationMs: performance.now() - orderStartedAt, operation: "criar comanda e pedido" });

          const total = Number(order.total);
          if (!order.id || !Number.isFinite(total) || total <= 0) {
            throw new Error("A criacao da comanda nao retornou um pedido valido.");
          }

          const paymentStartedAt = performance.now();
          const payment = await postJson("/api/operations/payments", cookie, {
            salesOrderId: order.id,
            payments: [{ method: "PIX", amount: roundMoney(total / 2) }]
          });
          timings.push({ durationMs: performance.now() - paymentStartedAt, operation: "pagamento parcial" });

          if (payment.fullyPaid !== false) {
            throw new Error(`A comanda ${tabCode} deveria permanecer parcialmente paga.`);
          }
        }
      })
    );

    workerResults.forEach((result) => {
      if (result.status === "rejected") {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    });

    const values = timings.map((timing) => timing.durationMs);
    const grouped = new Map<string, number[]>();
    timings.forEach((timing) => grouped.set(timing.operation, [...(grouped.get(timing.operation) ?? []), timing.durationMs]));

    console.log(`Carga de escrita: ${workers} trabalhadores x ${rounds} rodadas, ${timings.length} operacoes.`);
    console.table(
      Array.from(grouped.entries()).map(([operation, operationValues]) => ({
        operacao: operation,
        chamadas: operationValues.length,
        media: `${(operationValues.reduce((sum, value) => sum + value, 0) / operationValues.length).toFixed(0)} ms`,
        p50: `${percentile(operationValues, 50).toFixed(0)} ms`,
        p95: `${percentile(operationValues, 95).toFixed(0)} ms`,
        maximo: `${Math.max(...operationValues).toFixed(0)} ms`
      }))
    );

    if (errors.length > 0) {
      throw new Error(`Falhas na carga de escrita: ${errors.join(" | ")}`);
    }

    console.log(`Carga de escrita aprovada: media geral ${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(0)} ms, p95 geral ${percentile(values, 95).toFixed(0)} ms.`);
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
