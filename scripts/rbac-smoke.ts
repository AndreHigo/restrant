import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const attendantEmail = "qa-atendente";
const attendantPassword = "Atendente@123";

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

async function ensureAttendantUser() {
  const role = await db.role.findUniqueOrThrow({ where: { name: "atendente" } });

  await db.user.upsert({
    where: { email: attendantEmail },
    create: {
      email: attendantEmail,
      mustResetPassword: false,
      name: "QA Atendente",
      passwordHash: hashSync(attendantPassword, 10),
      roleId: role.id,
      status: "ACTIVE"
    },
    update: {
      mustResetPassword: false,
      passwordHash: hashSync(attendantPassword, 10),
      roleId: role.id,
      status: "ACTIVE"
    }
  });
}

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    redirect: "manual"
  });

  if (!response.ok) {
    throw new Error(`Login de ${email} falhou com HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const cookieHeader = createCookieHeader(getSetCookie(response.headers));

  if (!cookieHeader) {
    throw new Error(`Login de ${email} nao retornou cookie de sessao.`);
  }

  return cookieHeader;
}

async function main() {
  await ensureAttendantUser();

  const cookie = await login(attendantEmail, attendantPassword);
  const adminResponse = await fetch(`${baseUrl}/admin`, {
    headers: { cookie },
    redirect: "manual"
  });
  const operationResponse = await fetch(`${baseUrl}/operacao`, {
    headers: { cookie }
  });
  const operationBody = await operationResponse.text();

  const adminBlocked =
    adminResponse.status >= 300 &&
    adminResponse.status < 400 &&
    (adminResponse.headers.get("location") ?? "").includes("/operacao");
  const operationAllowed = operationResponse.ok && operationBody.includes("Painel operacional");

  console.table([
    { check: "atendente bloqueado no admin", ok: adminBlocked, status: adminResponse.status },
    { check: "atendente liberado na operacao", ok: operationAllowed, status: operationResponse.status }
  ]);

  if (!adminBlocked || !operationAllowed) {
    throw new Error("RBAC falhou para perfil atendente.");
  }

  console.log(`RBAC smoke aprovado em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
