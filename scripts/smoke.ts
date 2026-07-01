type SmokeCheck = {
  name: string;
  path: string;
  expectedText: string;
};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";

const checks: SmokeCheck[] = [
  { name: "login", path: "/login", expectedText: "Entrar no painel" },
  { name: "manifest", path: "/manifest.webmanifest", expectedText: "Restaurant Brasil" },
  { name: "admin", path: "/admin", expectedText: "Painel administrativo" },
  { name: "perfil", path: "/perfil", expectedText: "Editar perfil" },
  { name: "operacao", path: "/operacao", expectedText: "Painel operacional" },
  { name: "produtos", path: "/admin/produtos", expectedText: "Produtos" },
  { name: "insumos", path: "/admin/insumos", expectedText: "Base de insumos" },
  { name: "relatorios", path: "/admin/relatorios", expectedText: "Central de relatorios" },
  { name: "relatorio-vendas", path: "/admin/relatorios/vendas", expectedText: "Exportar PDF" },
  { name: "relatorio-estoque", path: "/admin/relatorios/estoque", expectedText: "Exportar PDF" },
  { name: "relatorio-compras", path: "/admin/relatorios/compras", expectedText: "Exportar PDF" },
  { name: "compras", path: "/admin/compras", expectedText: "Pedidos de compra" },
  { name: "relatorio-financeiro", path: "/admin/relatorios/financeiro", expectedText: "Exportar PDF" },
  { name: "financeiro", path: "/admin/financeiro", expectedText: "Conferencia por forma de pagamento" },
  { name: "relatorio-margem", path: "/admin/relatorios/margem", expectedText: "Exportar PDF" },
  { name: "configuracoes", path: "/admin/configuracoes", expectedText: "Central de configuracoes" },
  { name: "usuarios", path: "/admin/usuarios", expectedText: "Novo usuario" },
  { name: "fiscal", path: "/admin/fiscal", expectedText: "Configuracao fiscal da empresa" },
  { name: "estoque", path: "/admin/estoque", expectedText: "Validade critica" },
  { name: "inventario", path: "/admin/inventario", expectedText: "Inventario fisico" },
  { name: "perdas", path: "/admin/perdas", expectedText: "Perdas e desperdicio" },
  { name: "pedidos", path: "/operacao/pedidos", expectedText: "Novo pedido" },
  { name: "pedidos-garcom", path: "/operacao/pedidos?comanda=25&origem=garcom", expectedText: "Adicionar na comanda" },
  { name: "garcom", path: "/operacao/garcom", expectedText: "Comandas abertas" },
  { name: "producao", path: "/operacao/producao", expectedText: "Pendentes" },
  { name: "caixa", path: "/operacao/caixa", expectedText: "Caixa" },
  { name: "balanca-admin", path: "/admin/balanca", expectedText: "Dispositivos de balanca" },
  { name: "balanca", path: "/operacao/balanca", expectedText: "Balanca" }
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

async function expectOk(response: Response, context: string) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${context} retornou HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function main() {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual"
  });

  await expectOk(loginResponse, "Login");

  const cookieHeader = createCookieHeader(getSetCookie(loginResponse.headers));

  if (!cookieHeader) {
    throw new Error("Login nao retornou cookie de sessao.");
  }

  const results: Array<{ name: string; status: number; ok: boolean }> = [];

  for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: {
        cookie: cookieHeader
      }
    });
    const body = await response.text();
    const ok =
      response.ok &&
      body.includes(check.expectedText) &&
      !body.includes("Server Error") &&
      !body.includes("Application error") &&
      !body.includes("Cannot find module");

    results.push({ name: check.name, status: response.status, ok });

    if (!ok) {
      throw new Error(
        `${check.name} falhou: HTTP ${response.status}, esperado "${check.expectedText}". Trecho: ${body.slice(0, 300)}`
      );
    }
  }

  console.table(results);
  console.log(`Smoke test aprovado em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
