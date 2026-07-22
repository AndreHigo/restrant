import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = "qa-permissao-sensivel";
const password = "Permissao@123";
const authorizedEmail = "qa-permissao-autorizada";
const authorizedPassword = "Autorizada@123";

function getSetCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const values = candidate.getSetCookie?.() ?? [];

  return values.length > 0 ? values.map((value) => value.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function main() {
  const cashManage = await db.permission.findUniqueOrThrow({ where: { module_action: { module: "cash", action: "manage" } } });
  const authorizedPermissions = await db.permission.findMany({
    where: {
      OR: [
        { module: "cash", action: "cancel" },
        { module: "cash", action: "close" },
        { module: "cash", action: "refund" },
        { module: "stock", action: "manage" },
        { module: "fiscal", action: "transmit" }
      ]
    }
  });
  const role = await db.role.upsert({
    where: { name: "qa-caixa-restrito" },
    create: { description: "Perfil temporario de QA", isSystem: false, name: "qa-caixa-restrito" },
    update: { description: "Perfil temporario de QA" }
  });

  await db.rolePermission.deleteMany({ where: { roleId: role.id } });
  await db.rolePermission.create({ data: { permissionId: cashManage.id, roleId: role.id } });
  await db.user.upsert({
    where: { email },
    create: { email, mustResetPassword: false, name: "QA Caixa Restrito", passwordHash: hashSync(password, 10), roleId: role.id, status: "ACTIVE" },
    update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: role.id, status: "ACTIVE" }
  });
  const authorizedRole = await db.role.upsert({
    where: { name: "qa-permissao-autorizada" },
    create: { description: "Perfil autorizado de QA", isSystem: false, name: "qa-permissao-autorizada" },
    update: { description: "Perfil autorizado de QA" }
  });

  await db.rolePermission.deleteMany({ where: { roleId: authorizedRole.id } });
  await db.rolePermission.createMany({
    data: authorizedPermissions.map((permission) => ({ permissionId: permission.id, roleId: authorizedRole.id }))
  });
  await db.user.upsert({
    where: { email: authorizedEmail },
    create: {
      email: authorizedEmail,
      mustResetPassword: false,
      name: "QA Permissao Autorizada",
      passwordHash: hashSync(authorizedPassword, 10),
      roleId: authorizedRole.id,
      status: "ACTIVE"
    },
    update: {
      mustResetPassword: false,
      passwordHash: hashSync(authorizedPassword, 10),
      roleId: authorizedRole.id,
      status: "ACTIVE"
    }
  });

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const cookie = getSetCookie(login.headers);

  if (!login.ok || !cookie) {
    throw new Error("Nao foi possivel autenticar o usuario de QA.");
  }
  const authorizedLogin = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email: authorizedEmail, password: authorizedPassword }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const authorizedCookie = getSetCookie(authorizedLogin.headers);

  if (!authorizedLogin.ok || !authorizedCookie) {
    throw new Error("Nao foi possivel autenticar o usuario autorizado de QA.");
  }

  const requests = await Promise.all([
    fetch(`${baseUrl}/api/operations/cash-register/close`, { headers: { cookie }, method: "POST" }),
    fetch(`${baseUrl}/api/operations/payments/refund`, { headers: { cookie }, method: "POST" }),
    fetch(`${baseUrl}/api/operations/cash-register/orders/cancel`, { headers: { cookie }, method: "POST" }),
    fetch(`${baseUrl}/api/admin/stock/movements`, { headers: { cookie }, method: "POST" }),
    fetch(`${baseUrl}/api/admin/fiscal/nfce/transmit`, { headers: { cookie }, method: "POST" })
  ]);
  const statuses = requests.map((response) => response.status);
  const allBlocked = statuses.every((status) => status === 403);
  const authorizedRequests = await Promise.all([
    fetch(`${baseUrl}/api/operations/cash-register/close`, { headers: { cookie: authorizedCookie }, method: "POST" }),
    fetch(`${baseUrl}/api/operations/payments/refund`, { headers: { cookie: authorizedCookie }, method: "POST" }),
    fetch(`${baseUrl}/api/operations/cash-register/orders/cancel`, { headers: { cookie: authorizedCookie }, method: "POST" }),
    fetch(`${baseUrl}/api/admin/stock/movements`, { headers: { cookie: authorizedCookie }, method: "POST" }),
    fetch(`${baseUrl}/api/admin/fiscal/nfce/transmit`, { headers: { cookie: authorizedCookie }, method: "POST" })
  ]);
  const authorizedStatuses = authorizedRequests.map((response) => response.status);
  const allAuthorized = authorizedStatuses.every((status) => status !== 403);

  console.table([
    { check: "fechamento exige cash.close", ok: statuses[0] === 403, status: statuses[0] },
    { check: "estorno exige cash.refund", ok: statuses[1] === 403, status: statuses[1] },
    { check: "cancelamento exige cash.cancel", ok: statuses[2] === 403, status: statuses[2] },
    { check: "movimento exige stock.manage", ok: statuses[3] === 403, status: statuses[3] },
    { check: "transmissao exige fiscal.transmit", ok: statuses[4] === 403, status: statuses[4] },
    { check: "perfil autorizado passa pelas guardas", ok: allAuthorized, status: authorizedStatuses.join(",") }
  ]);

  if (!allBlocked || !allAuthorized) {
    throw new Error("Uma acao sensivel ficou acessivel sem permissao especifica.");
  }

  console.log(`Permissoes sensiveis aprovadas em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
