import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = "qa-desconto-limitado";
const password = "Desconto@123";
const tabNumber = "999902";
const orderNumber = "QA-DISCOUNT-LIMIT-001";

function getSetCookie(headers: Headers) {
  const candidate = headers as Headers & { getSetCookie?: () => string[] };
  const values = candidate.getSetCookie?.() ?? [];

  return values.length > 0 ? values.map((value) => value.split(";")[0]).join("; ") : headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function main() {
  const permissions = await db.permission.findMany({
    where: { module: "sales", action: { in: ["manage", "adjust_item", "discount_item"] } }
  });

  if (permissions.length !== 3) {
    throw new Error("As permissoes de desconto ainda nao foram sincronizadas.");
  }

  const role = await db.role.upsert({
    where: { name: "qa-desconto-limitado" },
    create: { description: "QA de limite de desconto", itemDiscountLimitPercent: 15, isSystem: false, name: "qa-desconto-limitado" },
    update: { description: "QA de limite de desconto", itemDiscountLimitPercent: 15 }
  });
  await db.rolePermission.deleteMany({ where: { roleId: role.id } });
  await db.rolePermission.createMany({ data: permissions.map((permission) => ({ permissionId: permission.id, roleId: role.id })) });
  await db.user.upsert({
    where: { email },
    create: { email, mustResetPassword: false, name: "QA Desconto Limitado", passwordHash: hashSync(password, 10), roleId: role.id, status: "ACTIVE" },
    update: { mustResetPassword: false, passwordHash: hashSync(password, 10), roleId: role.id, status: "ACTIVE" }
  });

  await db.salesOrder.deleteMany({ where: { number: orderNumber } });
  await db.tab.deleteMany({ where: { number: tabNumber } });

  try {
    const product = await db.product.findFirstOrThrow({ where: { active: true } });
    const tab = await db.tab.create({ data: { customerName: "QA Limite de desconto", number: tabNumber } });
    const order = await db.salesOrder.create({
      data: {
        channel: "TAB",
        number: orderNumber,
        status: "OPEN",
        subtotal: 100,
        tabId: tab.id,
        total: 100,
        items: { create: { productId: product.id, quantity: 1, totalPrice: 100, unitPrice: 100 } }
      },
      include: { items: true }
    });
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const cookie = getSetCookie(login.headers);
    const response = await fetch(`${baseUrl}/api/operations/orders/items/update`, {
      body: JSON.stringify({ discount: 20, reason: "QA acima do limite", salesOrderItemId: order.items[0].id }),
      headers: { "Content-Type": "application/json", cookie },
      method: "POST"
    });
    const payload = (await response.json()) as { error?: string };
    const blocked = response.status === 400 && payload.error?.includes("15%") === true;

    console.table([{ check: "desconto acima do limite bloqueado", ok: blocked, status: response.status }]);
    if (!blocked) {
      throw new Error(payload.error ?? "O limite de desconto nao foi aplicado.");
    }
  } finally {
    await db.salesOrder.deleteMany({ where: { number: orderNumber } });
    await db.tab.deleteMany({ where: { number: tabNumber } });
  }

  console.log(`Limite de desconto aprovado em ${baseUrl}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
