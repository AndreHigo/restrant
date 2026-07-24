import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const restrictedEmail = "qa-operacao-restrita";
const authorizedEmail = "qa-operacao-autorizada";
const itemEditorEmail = "qa-operacao-editor-item";
const password = "Operacao@123";

const guardedActions = [
  "adjust_item",
  "discount_item",
  "cancel_item",
  "transfer_item",
  "manual_weight",
  "adjust_order",
  "cancel_order",
  "merge_tabs"
];

const guardedRoutes = [
  "/api/operations/orders/items/update",
  "/api/operations/orders/items/update",
  "/api/operations/orders/items/cancel",
  "/api/operations/orders/items/transfer",
  "/api/operations/orders/items/weight",
  "/api/operations/orders/adjustments",
  "/api/operations/orders/cancel",
  "/api/operations/tabs/merge"
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
  const salesManage = await db.permission.findUniqueOrThrow({
    where: { module_action: { module: "sales", action: "manage" } }
  });
  const salesView = await db.permission.findUniqueOrThrow({
    where: { module_action: { module: "sales", action: "view" } }
  });
  const actionPermissions = await db.permission.findMany({
    where: { module: "sales", action: { in: guardedActions } }
  });
  const adjustItem = actionPermissions.find((permission) => permission.action === "adjust_item");
  const discountItem = actionPermissions.find((permission) => permission.action === "discount_item");

  if (actionPermissions.length !== guardedActions.length || !adjustItem || !discountItem) {
    throw new Error("As permissoes operacionais ainda nao foram sincronizadas no banco.");
  }

  const restrictedRole = await db.role.upsert({
    where: { name: "qa-operacao-restrita" },
    create: { description: "Perfil de QA sem acoes sensiveis", isSystem: false, name: "qa-operacao-restrita" },
    update: { description: "Perfil de QA sem acoes sensiveis" }
  });
  const authorizedRole = await db.role.upsert({
    where: { name: "qa-operacao-autorizada" },
    create: { description: "Perfil de QA com acoes sensiveis", isSystem: false, name: "qa-operacao-autorizada" },
    update: { description: "Perfil de QA com acoes sensiveis" }
  });
  const itemEditorRole = await db.role.upsert({
    where: { name: "qa-operacao-editor-item" },
    create: { description: "Perfil de QA que edita item sem desconto", isSystem: false, name: "qa-operacao-editor-item" },
    update: { description: "Perfil de QA que edita item sem desconto" }
  });

  await db.rolePermission.deleteMany({ where: { roleId: { in: [restrictedRole.id, authorizedRole.id, itemEditorRole.id] } } });
  await db.rolePermission.create({ data: { permissionId: salesManage.id, roleId: restrictedRole.id } });
  await db.rolePermission.createMany({
    data: [salesView, salesManage, adjustItem].map((permission) => ({ permissionId: permission.id, roleId: itemEditorRole.id }))
  });
  await db.rolePermission.createMany({
    data: [salesManage, ...actionPermissions].map((permission) => ({ permissionId: permission.id, roleId: authorizedRole.id }))
  });

  await Promise.all([
    db.user.upsert({
      where: { email: restrictedEmail },
      create: { email: restrictedEmail, mustResetPassword: false, name: "QA Operacao Restrita", passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" }
    }),
    db.user.upsert({
      where: { email: authorizedEmail },
      create: { email: authorizedEmail, mustResetPassword: false, name: "QA Operacao Autorizada", passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" }
    }),
    db.user.upsert({
      where: { email: itemEditorEmail },
      create: { email: itemEditorEmail, mustResetPassword: false, name: "QA Editor de Item", passwordHash: hashSync(password, 10), roleId: itemEditorRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: itemEditorRole.id, status: "ACTIVE" }
    })
  ]);

  const [restrictedCookie, authorizedCookie, itemEditorCookie] = await Promise.all([
    login(restrictedEmail),
    login(authorizedEmail),
    login(itemEditorEmail)
  ]);
  const requestOptions = (cookie: string) => ({
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json", cookie },
    method: "POST"
  });
  const [restrictedResponses, authorizedResponses] = await Promise.all([
    Promise.all(guardedRoutes.map((route) => fetch(`${baseUrl}${route}`, requestOptions(restrictedCookie)))),
    Promise.all(guardedRoutes.map((route) => fetch(`${baseUrl}${route}`, requestOptions(authorizedCookie))))
  ]);
  const restrictedStatuses = restrictedResponses.map((response) => response.status);
  const authorizedStatuses = authorizedResponses.map((response) => response.status);
  const restrictedBlocked = restrictedStatuses.every((status) => status === 403);
  const authorizedPassedGuard = authorizedStatuses.every((status) => status !== 403);
  const discountResponse = await fetch(`${baseUrl}/api/operations/orders/items/update`, {
    body: JSON.stringify({ discount: 1, reason: "QA desconto sem permissao", salesOrderItemId: "qa-item" }),
    headers: { "Content-Type": "application/json", cookie: itemEditorCookie },
    method: "POST"
  });
  const itemEditorBlockedFromDiscount = discountResponse.status === 403;

  console.table(
    guardedActions.map((action, index) => ({
      action: `sales.${action}`,
      authorizedStatus: authorizedStatuses[index],
      blockedWithoutPermission: restrictedStatuses[index] === 403,
      restrictedStatus: restrictedStatuses[index]
    }))
  );
  console.table([{ check: "editor de item sem desconto bloqueado", ok: itemEditorBlockedFromDiscount, status: discountResponse.status }]);

  if (!restrictedBlocked || !authorizedPassedGuard || !itemEditorBlockedFromDiscount) {
    throw new Error("Uma acao operacional critica esta com permissao incorreta.");
  }

  console.log(`Permissoes operacionais aprovadas em ${baseUrl}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
