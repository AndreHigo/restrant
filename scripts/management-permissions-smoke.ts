import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const restrictedEmail = "qa-gestao-restrita";
const authorizedEmail = "qa-gestao-autorizada";
const password = "Gestao@123";

const guardedPermissions = [
  "stock.adjust",
  "purchases.receive",
  "purchases.cancel",
  "financial.pay",
  "financial.receive",
  "financial.reconcile"
];

const guardedRoutes = [
  "/api/admin/stock/movements",
  "/api/admin/purchases/receive",
  "/api/admin/purchases/cancel",
  "/api/admin/financial/payables/pay",
  "/api/admin/financial/receivables/receive",
  "/api/admin/financial/reconciliation"
];

function getSetCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const values = candidate.getSetCookie?.() ?? [];
  return values.length > 0 ? values.map((value) => value.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function login(email: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const cookie = getSetCookie(response.headers);

  if (!response.ok || !cookie) {
    throw new Error(`Nao foi possivel autenticar ${email}.`);
  }

  return cookie;
}

async function main() {
  const genericPermissions = await db.permission.findMany({
    where: {
      OR: [
        { module: "stock", action: "manage" },
        { module: "stock", action: "view" },
        { module: "purchases", action: "manage" },
        { module: "purchases", action: "view" },
        { module: "financial", action: "manage" },
        { module: "financial", action: "view" }
      ]
    }
  });
  const actionPermissions = await db.permission.findMany({
    where: {
      OR: guardedPermissions.map((key) => {
        const [module, action] = key.split(".");
        return { action, module };
      })
    }
  });

  if (genericPermissions.length !== 6 || actionPermissions.length !== guardedPermissions.length) {
    throw new Error("As permissoes de gestao ainda nao foram sincronizadas no banco.");
  }

  const restrictedRole = await db.role.upsert({
    where: { name: "qa-gestao-restrita" },
    create: { description: "Perfil de QA sem acoes financeiras e de estoque", isSystem: false, name: "qa-gestao-restrita" },
    update: { description: "Perfil de QA sem acoes financeiras e de estoque" }
  });
  const authorizedRole = await db.role.upsert({
    where: { name: "qa-gestao-autorizada" },
    create: { description: "Perfil de QA com acoes financeiras e de estoque", isSystem: false, name: "qa-gestao-autorizada" },
    update: { description: "Perfil de QA com acoes financeiras e de estoque" }
  });

  await db.rolePermission.deleteMany({ where: { roleId: { in: [restrictedRole.id, authorizedRole.id] } } });
  await db.rolePermission.createMany({
    data: genericPermissions.map((permission) => ({ permissionId: permission.id, roleId: restrictedRole.id }))
  });
  await db.rolePermission.createMany({
    data: [...genericPermissions, ...actionPermissions].map((permission) => ({ permissionId: permission.id, roleId: authorizedRole.id }))
  });

  await Promise.all([
    db.user.upsert({
      where: { email: restrictedEmail },
      create: { email: restrictedEmail, mustResetPassword: false, name: "QA Gestao Restrita", passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" }
    }),
    db.user.upsert({
      where: { email: authorizedEmail },
      create: { email: authorizedEmail, mustResetPassword: false, name: "QA Gestao Autorizada", passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" }
    })
  ]);

  const [restrictedCookie, authorizedCookie] = await Promise.all([login(restrictedEmail), login(authorizedEmail)]);
  const options = (cookie: string) => ({
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json", cookie },
    method: "POST"
  });
  const [restrictedResponses, authorizedResponses] = await Promise.all([
    Promise.all(guardedRoutes.map((route) => fetch(`${baseUrl}${route}`, options(restrictedCookie)))),
    Promise.all(guardedRoutes.map((route) => fetch(`${baseUrl}${route}`, options(authorizedCookie))))
  ]);
  const restrictedStatuses = restrictedResponses.map((response) => response.status);
  const authorizedStatuses = authorizedResponses.map((response) => response.status);
  const blocked = restrictedStatuses.every((status) => status === 403);
  const passedGuard = authorizedStatuses.every((status) => status !== 403);
  const [restrictedStock, restrictedPurchases, restrictedFinancial, authorizedPurchases, authorizedFinancial] = await Promise.all([
    fetch(`${baseUrl}/admin/estoque`, { headers: { cookie: restrictedCookie } }).then((response) => response.text()),
    fetch(`${baseUrl}/admin/compras`, { headers: { cookie: restrictedCookie } }).then((response) => response.text()),
    fetch(`${baseUrl}/admin/financeiro`, { headers: { cookie: restrictedCookie } }).then((response) => response.text()),
    fetch(`${baseUrl}/admin/compras`, { headers: { cookie: authorizedCookie } }).then((response) => response.text()),
    fetch(`${baseUrl}/admin/financeiro`, { headers: { cookie: authorizedCookie } }).then((response) => response.text())
  ]);
  const restrictedUiHidden =
    restrictedStock.includes("nao registrar movimentacoes manuais") &&
    !restrictedPurchases.includes("Receber pedido") &&
    !restrictedFinancial.includes("Baixa financeira") &&
    !restrictedFinancial.includes("Recebimento financeiro");
  const authorizedUiVisible =
    authorizedPurchases.includes("Receber pedido") &&
    authorizedFinancial.includes("Baixa financeira") &&
    authorizedFinancial.includes("Recebimento financeiro");

  console.table(
    guardedPermissions.map((permission, index) => ({
      permission,
      authorizedStatus: authorizedStatuses[index],
      blockedWithoutPermission: restrictedStatuses[index] === 403,
      restrictedStatus: restrictedStatuses[index]
    }))
  );
  console.table([
    { check: "acoes ocultas para perfil restrito", ok: restrictedUiHidden },
    { check: "acoes visiveis para perfil autorizado", ok: authorizedUiVisible }
  ]);

  if (!blocked || !passedGuard || !restrictedUiHidden || !authorizedUiVisible) {
    throw new Error("Uma acao critica de gestao esta com permissao incorreta.");
  }

  console.log(`Permissoes de gestao aprovadas em ${baseUrl}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
