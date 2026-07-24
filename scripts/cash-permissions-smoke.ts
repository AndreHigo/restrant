import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const restrictedEmail = "qa-caixa-acesso-restrito";
const authorizedEmail = "qa-caixa-acoes-autorizadas";
const password = "Caixa@12345";
const fixtureOrderNumber = "QA-CASH-PERM-001";
const fixtureRefundOrderNumber = "QA-CASH-REFUND-001";
const fixtureTabNumber = "999901";

const permissionKeys = ["cash.open", "cash.charge", "cash.refund", "cash.supply", "cash.withdraw"];
const pagePermissionKeys = ["cash.manage", "sales.manage", "sales.adjust_order"];
const guardedChecks = [
  {
    body: { openingAmount: -1, notes: "QA permissao" },
    method: "POST",
    permission: "cash.open",
    route: "/api/operations/cash-register/open"
  },
  {
    body: { payments: [] },
    method: "POST",
    permission: "cash.charge",
    route: "/api/operations/payments"
  },
  {
    body: { amount: 0, reason: "QA suprimento", type: "SUPPLY" },
    method: "POST",
    permission: "cash.supply",
    route: "/api/operations/cash-register/movements"
  },
  {
    body: { amount: 0, reason: "QA sangria", type: "WITHDRAWAL" },
    method: "POST",
    permission: "cash.withdraw",
    route: "/api/operations/cash-register/movements"
  }
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

async function cleanupCashPermissionFixture() {
  await db.salesOrder.deleteMany({ where: { number: { in: [fixtureOrderNumber, fixtureRefundOrderNumber] } } });
  await db.tab.deleteMany({ where: { number: fixtureTabNumber } });
}

async function main() {
  const permissions = await db.permission.findMany({
    where: {
      OR: [...pagePermissionKeys, ...permissionKeys].map((key) => {
          const [module, action] = key.split(".");
          return { action, module };
        })
    }
  });
  const byKey = new Map(permissions.map((permission) => [`${permission.module}.${permission.action}`, permission]));
  const cashManage = byKey.get("cash.manage");
  const salesManage = byKey.get("sales.manage");
  const adjustOrder = byKey.get("sales.adjust_order");
  const actionPermissions = permissionKeys.map((key) => byKey.get(key));

  if (!cashManage || !salesManage || !adjustOrder || actionPermissions.some((permission) => !permission)) {
    throw new Error("As permissoes de caixa ainda nao foram sincronizadas no banco.");
  }

  const restrictedRole = await db.role.upsert({
    where: { name: "qa-caixa-acesso-restrito" },
    create: { description: "Perfil de QA com acesso ao caixa sem acoes sensiveis", isSystem: false, name: "qa-caixa-acesso-restrito" },
    update: { description: "Perfil de QA com acesso ao caixa sem acoes sensiveis" }
  });
  const authorizedRole = await db.role.upsert({
    where: { name: "qa-caixa-acoes-autorizadas" },
    create: { description: "Perfil de QA com acoes de caixa autorizadas", isSystem: false, name: "qa-caixa-acoes-autorizadas" },
    update: { description: "Perfil de QA com acoes de caixa autorizadas" }
  });

  await db.rolePermission.deleteMany({ where: { roleId: { in: [restrictedRole.id, authorizedRole.id] } } });
  await db.rolePermission.createMany({
    data: [cashManage, salesManage].map((permission) => ({ permissionId: permission.id, roleId: restrictedRole.id }))
  });
  await db.rolePermission.createMany({
    data: [cashManage, salesManage, adjustOrder, ...(actionPermissions as NonNullable<(typeof actionPermissions)[number]>[])].map((permission) => ({
      permissionId: permission.id,
      roleId: authorizedRole.id
    }))
  });

  await Promise.all([
    db.user.upsert({
      where: { email: restrictedEmail },
      create: { email: restrictedEmail, mustResetPassword: false, name: "QA Caixa Restrito", passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: restrictedRole.id, status: "ACTIVE" }
    }),
    db.user.upsert({
      where: { email: authorizedEmail },
      create: { email: authorizedEmail, mustResetPassword: false, name: "QA Caixa Autorizado", passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" },
      update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: authorizedRole.id, status: "ACTIVE" }
    })
  ]);

  await cleanupCashPermissionFixture();

  try {
    const product = await db.product.findFirstOrThrow({ where: { active: true } });
    const tab = await db.tab.create({
      data: {
        customerName: "QA Permissao Caixa",
        number: fixtureTabNumber
      }
    });
    const refundOrder = await db.salesOrder.create({
      data: {
        channel: "TAB",
        closedAt: new Date(),
        number: fixtureRefundOrderNumber,
        status: "PAID",
        subtotal: 10,
        tabId: tab.id,
        total: 10,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            totalPrice: 10,
            unitPrice: 10
          }
        }
      }
    });
    await db.payment.create({
      data: {
        amount: 10,
        method: "PIX",
        paidAt: new Date(),
        salesOrderId: refundOrder.id,
        status: "PAID"
      }
    });
    await db.salesOrder.create({
      data: {
        channel: "TAB",
        number: fixtureOrderNumber,
        status: "OPEN",
        subtotal: 10,
        tabId: tab.id,
        total: 10,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            totalPrice: 10,
            unitPrice: 10
          }
        }
      }
    });

    const [restrictedCookie, authorizedCookie] = await Promise.all([login(restrictedEmail), login(authorizedEmail)]);
    const [restrictedResponses, authorizedResponses] = await Promise.all([
      Promise.all(
        guardedChecks.map((check) =>
          fetch(`${baseUrl}${check.route}`, {
            body: JSON.stringify(check.body),
            headers: { "Content-Type": "application/json", cookie: restrictedCookie },
            method: check.method
          })
        )
      ),
      Promise.all(
        guardedChecks.map((check) =>
          fetch(`${baseUrl}${check.route}`, {
            body: JSON.stringify(check.body),
            headers: { "Content-Type": "application/json", cookie: authorizedCookie },
            method: check.method
          })
        )
      )
    ]);
    const restrictedStatuses = restrictedResponses.map((response) => response.status);
    const authorizedStatuses = authorizedResponses.map((response) => response.status);
    const blocked = restrictedStatuses.every((status) => status === 403);
    const passedGuard = authorizedStatuses.every((status) => status !== 403);
    const hasOpenRegister = Boolean(await db.cashRegister.findFirst({ where: { status: "OPEN" } }));
    const [restrictedCashHtml, authorizedCashHtml] = await Promise.all([
      fetch(`${baseUrl}/operacao/caixa?status=all&comanda=${fixtureTabNumber}`, { headers: { cookie: restrictedCookie } }).then((response) => response.text()),
      fetch(`${baseUrl}/operacao/caixa?status=all&comanda=${fixtureTabNumber}`, { headers: { cookie: authorizedCookie } }).then((response) => response.text())
    ]);
    const restrictedUiHidden = hasOpenRegister
      ? restrictedCashHtml.includes("Suprimento e sangria exigem permissoes especificas") &&
        restrictedCashHtml.includes("Receber pagamento exige permissao especifica") &&
        !restrictedCashHtml.includes("Receber agora") &&
        !restrictedCashHtml.includes("Estornar")
      : restrictedCashHtml.includes("Abrir caixa exige permissao especifica");
    const authorizedUiVisible = hasOpenRegister
      ? authorizedCashHtml.includes("Suprimento") && authorizedCashHtml.includes("Sangria") && authorizedCashHtml.includes("Receber agora") && authorizedCashHtml.includes("Estornar")
      : authorizedCashHtml.includes("Abrir caixa");
    const adjustmentUiProtected =
      restrictedCashHtml.includes("Desconto e taxa exigem permissao especifica para ajustar o pedido.") &&
      !restrictedCashHtml.includes("Aplicar ajuste") &&
      authorizedCashHtml.includes("Aplicar ajuste");

    console.table(
      guardedChecks.map((check, index) => ({
        permission: check.permission,
        authorizedStatus: authorizedStatuses[index],
        blockedWithoutPermission: restrictedStatuses[index] === 403,
        restrictedStatus: restrictedStatuses[index]
      }))
    );
    console.table([
      { check: "acoes de caixa ocultas para perfil restrito", ok: restrictedUiHidden },
      { check: "acoes de caixa visiveis para perfil autorizado", ok: authorizedUiVisible },
      { check: "desconto e taxa exigem sales.adjust_order", ok: adjustmentUiProtected }
    ]);

    if (!blocked || !passedGuard || !restrictedUiHidden || !authorizedUiVisible || !adjustmentUiProtected) {
      throw new Error("Uma acao critica de caixa esta com permissao incorreta.");
    }
  } finally {
    await cleanupCashPermissionFixture();
  }

  console.log(`Permissoes de caixa aprovadas em ${baseUrl}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
