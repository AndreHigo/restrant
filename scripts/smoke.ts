type SmokeCheck = {
  name: string;
  path: string;
  expectedText: string;
};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";

const checks: SmokeCheck[] = [
  { name: "login", path: "/login", expectedText: "Entrar no sistema" },
  { name: "recuperar-senha", path: "/recuperar-senha", expectedText: "Esqueci minha senha" },
  { name: "redefinir-senha", path: "/redefinir-senha", expectedText: "Redefinir senha" },
  { name: "manifest", path: "/manifest.webmanifest", expectedText: "Restaurant Brasil" },
  { name: "admin", path: "/admin", expectedText: "Painel administrativo" },
  { name: "perfil", path: "/perfil", expectedText: "Editar perfil" },
  { name: "operacao", path: "/operacao", expectedText: "Painel operacional" },
  { name: "operacao-acesso-rapido", path: "/operacao", expectedText: "Acesso rapido por comanda" },
  { name: "produtos", path: "/admin/produtos", expectedText: "Produtos" },
  { name: "insumos", path: "/admin/insumos", expectedText: "Base de insumos" },
  { name: "relatorios", path: "/admin/relatorios", expectedText: "Central de relatorios" },
  { name: "relatorio-vendas", path: "/admin/relatorios/vendas", expectedText: "Exportar PDF" },
  { name: "relatorio-estoque", path: "/admin/relatorios/estoque", expectedText: "Exportar PDF" },
  { name: "relatorio-compras", path: "/admin/relatorios/compras", expectedText: "Exportar PDF" },
  { name: "compras", path: "/admin/compras", expectedText: "Pedidos de compra" },
  { name: "compras-relatorios-contextuais", path: "/admin/compras", expectedText: "Relatorios de compras" },
  { name: "compras-sugestoes-estoque", path: "/admin/compras", expectedText: "Sugestoes por estoque minimo" },
  { name: "compras-cancelamento", path: "/admin/compras", expectedText: "Cancelar compra" },
  { name: "compras-conferencia", path: "/admin/compras", expectedText: "Conferencia" },
  { name: "relatorio-financeiro", path: "/admin/relatorios/financeiro", expectedText: "Exportar PDF" },
  { name: "financeiro", path: "/admin/financeiro", expectedText: "Fechamento diario do caixa" },
  { name: "financeiro-relatorios-contextuais", path: "/admin/financeiro", expectedText: "Relatorios financeiros" },
  { name: "financeiro-recebiveis-vencidos", path: "/admin/financeiro", expectedText: "Recebiveis vencidos" },
  { name: "financeiro-taxas-maquininha", path: "/admin/financeiro", expectedText: "Taxas de maquininha" },
  { name: "relatorio-margem", path: "/admin/relatorios/margem", expectedText: "Exportar PDF" },
  { name: "configuracoes", path: "/admin/configuracoes", expectedText: "Central de configuracoes" },
  { name: "configuracoes-operacao", path: "/admin/configuracoes/operacao", expectedText: "Modos de operacao do restaurante" },
  { name: "prontidao", path: "/admin/prontidao", expectedText: "Prontidao do MVP" },
  { name: "usuarios", path: "/admin/usuarios", expectedText: "Novo usuario" },
  { name: "perfis", path: "/admin/perfis", expectedText: "Salvar permissoes" },
  { name: "fiscal", path: "/admin/fiscal", expectedText: "Configuracao fiscal da empresa" },
  { name: "fiscal-nfce-homologacao", path: "/admin/fiscal", expectedText: "Teste de emissao NFC-e em homologacao" },
  { name: "fiscal-nfce-status-svrs", path: "/admin/fiscal", expectedText: "Testar homologacao SVRS" },
  { name: "fiscal-certificado-a1", path: "/admin/fiscal", expectedText: "Certificado A1 para homologacao" },
  { name: "fiscal-xml-assinatura", path: "/admin/fiscal", expectedText: "XML gerado" },
  { name: "fiscal-assinar-xml", path: "/admin/fiscal", expectedText: "assinatura digital" },
  { name: "fiscal-recibo-svrs", path: "/admin/fiscal", expectedText: "consulte o recibo" },
  { name: "fiscal-cancelamento", path: "/admin/fiscal", expectedText: "Historico fiscal recente" },
  { name: "estoque", path: "/admin/estoque", expectedText: "Validade critica" },
  { name: "estoque-relatorios-contextuais", path: "/admin/estoque", expectedText: "Relatorios de estoque" },
  { name: "inventario", path: "/admin/inventario", expectedText: "Inventario fisico" },
  { name: "perdas", path: "/admin/perdas", expectedText: "Perdas e desperdicio" },
  { name: "pedidos", path: "/operacao/pedidos", expectedText: "Novo pedido" },
  { name: "pedidos-garcom", path: "/operacao/pedidos?comanda=25&origem=garcom", expectedText: "Adicionar na comanda" },
  { name: "garcom", path: "/operacao/garcom?comanda=25", expectedText: "Lancamento rapido por codigo" },
  { name: "balcao", path: "/operacao/balcao", expectedText: "Atendimento rapido de balcao" },
  { name: "comandas", path: "/operacao/comandas", expectedText: "Retomar comanda por numero" },
  { name: "producao", path: "/operacao/producao", expectedText: "Alerta de producao" },
  { name: "caixa", path: "/operacao/caixa", expectedText: "Caixa" },
  { name: "caixa-cupom-nao-fiscal", path: "/operacao/caixa", expectedText: "cupom nao fiscal" },
  { name: "caixa-relatorios-contextuais", path: "/operacao/caixa", expectedText: "Relatorios do caixa" },
  { name: "balanca-admin", path: "/admin/balanca", expectedText: "Dispositivos de balanca" },
  { name: "balanca", path: "/operacao/balanca", expectedText: "Manter comanda" }
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

  const dailyClosingResponse = await fetch(`${baseUrl}/api/admin/reports/daily-closing`, {
    headers: {
      cookie: cookieHeader
    }
  });
  const dailyClosingBody = await dailyClosingResponse.text();
  const dailyClosingOk =
    dailyClosingResponse.ok &&
    dailyClosingBody.includes("Resumo") &&
    dailyClosingResponse.headers.get("content-disposition")?.includes("fechamento-diario");

  results.push({ name: "fechamento-diario-csv", status: dailyClosingResponse.status, ok: Boolean(dailyClosingOk) });

  if (!dailyClosingOk) {
    throw new Error(
      `fechamento-diario-csv falhou: HTTP ${dailyClosingResponse.status}. Trecho: ${dailyClosingBody.slice(0, 300)}`
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const reconciliationResponse = await fetch(`${baseUrl}/api/admin/financial/reconciliation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader
    },
    body: JSON.stringify({
      countedAmount: 0,
      date: today,
      expectedAmount: 0,
      method: "PIX",
      notes: "Smoke test de conciliacao"
    })
  });
  const reconciliationBody = await reconciliationResponse.text();
  const reconciliationOk = reconciliationResponse.ok && reconciliationBody.includes("payment_method_reconciliation");

  results.push({ name: "conciliacao-pagamento", status: reconciliationResponse.status, ok: reconciliationOk });

  if (!reconciliationOk) {
    throw new Error(
      `conciliacao-pagamento falhou: HTTP ${reconciliationResponse.status}. Trecho: ${reconciliationBody.slice(0, 300)}`
    );
  }

  console.table(results);
  console.log(`Smoke test aprovado em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
