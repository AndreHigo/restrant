export {};

type Timing = {
  durationMs: number;
  route: string;
  status: number;
};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";
const workers = Math.min(8, Math.max(1, Number(process.env.LOAD_WORKERS ?? 4)));
const rounds = Math.min(8, Math.max(1, Number(process.env.LOAD_ROUNDS ?? 3)));
const routes = [
  "/operacao",
  "/operacao/pedidos",
  "/operacao/comandas",
  "/operacao/balanca",
  "/operacao/cozinha",
  "/operacao/caixa",
  "/admin/relatorios/vendas",
  "/admin/financeiro"
];

function getCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = candidate.getSetCookie?.() ?? [];
  return cookies.length > 0 ? cookies.map((cookie) => cookie.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function login() {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const cookie = getCookie(response.headers);

  if (!response.ok || !cookie) {
    throw new Error(`Login de carga retornou HTTP ${response.status}.`);
  }

  return { cookie, durationMs: performance.now() - startedAt };
}

async function requestRoute(route: string, cookie: string): Promise<Timing> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  const body = await response.text();

  if (!response.ok || body.includes("Application error") || body.includes("Server Error")) {
    throw new Error(`${route} retornou HTTP ${response.status}.`);
  }

  return { durationMs: performance.now() - startedAt, route, status: response.status };
}

function percentile(values: number[], percentage: number) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil((percentage / 100) * ordered.length) - 1);
  return ordered[Math.max(0, index)] ?? 0;
}

function formatMs(value: number) {
  return `${value.toFixed(0)} ms`;
}

async function main() {
  const timings: Timing[] = [];
  const errors: string[] = [];
  const startedAt = performance.now();

  await Promise.all(
    Array.from({ length: workers }, async () => {
      try {
        const session = await login();
        timings.push({ durationMs: session.durationMs, route: "LOGIN", status: 200 });

        for (let round = 0; round < rounds; round += 1) {
          const results = await Promise.allSettled(routes.map((route) => requestRoute(route, session.cookie)));
          results.forEach((result, index) => {
            if (result.status === "fulfilled") {
              timings.push(result.value);
            } else {
              errors.push(`${routes[index]}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
            }
          });
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    })
  );

  const durationMs = performance.now() - startedAt;
  const values = timings.map((timing) => timing.durationMs);
  const routeStats = new Map<string, number[]>();

  timings.forEach((timing) => {
    const current = routeStats.get(timing.route) ?? [];
    current.push(timing.durationMs);
    routeStats.set(timing.route, current);
  });

  console.log(`Carga leve: ${workers} trabalhadores x ${rounds} rodadas, ${timings.length} respostas em ${formatMs(durationMs)}.`);
  console.table(
    Array.from(routeStats.entries()).map(([route, routeValues]) => ({
      rota: route,
      chamadas: routeValues.length,
      media: formatMs(routeValues.reduce((sum, value) => sum + value, 0) / routeValues.length),
      p50: formatMs(percentile(routeValues, 50)),
      p95: formatMs(percentile(routeValues, 95)),
      maximo: formatMs(Math.max(...routeValues))
    }))
  );

  if (errors.length > 0) {
    console.error(`Falhas de carga: ${errors.join(" | ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Carga leve aprovada: media geral ${formatMs(values.reduce((sum, value) => sum + value, 0) / values.length)}, p95 geral ${formatMs(percentile(values, 95))}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
