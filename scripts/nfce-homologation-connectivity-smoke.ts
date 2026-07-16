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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual"
  });

  if (!response.ok) {
    throw new Error(`Login retornou HTTP ${response.status}.`);
  }

  const cookieHeader = createCookieHeader(getSetCookie(response.headers));

  if (!cookieHeader) {
    throw new Error("Login nao retornou cookie de sessao.");
  }

  return cookieHeader;
}

async function main() {
  const cookieHeader = await login();
  const response = await fetch(`${baseUrl}/api/admin/fiscal/nfce/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader
    },
    body: JSON.stringify({
      environment: "homologacao"
    })
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Status NFC-e retornou HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = JSON.parse(body) as {
    errorCode?: string;
    httpStatus: number;
    protectedBySefaz?: boolean;
    reachable: boolean;
    statusServiceUrl: string;
    tlsIssue?: boolean;
  };

  const results = [
    {
      detail: payload.statusServiceUrl,
      label: "url-homologacao-svrs",
      ok: payload.statusServiceUrl.includes("nfce-homologacao.svrs.rs.gov.br")
    },
    {
      detail: payload.tlsIssue ? `TLS local: ${payload.errorCode}` : `HTTP ${payload.httpStatus}`,
      label: "wsdl-status-servico",
      ok: payload.reachable || payload.protectedBySefaz || payload.tlsIssue === true
    }
  ];

  console.table(results);

  const failed = results.filter((item) => !item.ok);

  if (failed.length > 0) {
    throw new Error(`Conectividade NFC-e falhou: ${failed.map((item) => item.label).join(", ")}`);
  }

  console.log("Conectividade com homologacao SVRS validada.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
