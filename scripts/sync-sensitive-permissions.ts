import { db } from "@/lib/db";

const permissions = [
  { module: "cash", action: "open" },
  { module: "cash", action: "charge" },
  { module: "cash", action: "supply" },
  { module: "cash", action: "withdraw" },
  { module: "cash", action: "cancel" },
  { module: "cash", action: "close" },
  { module: "cash", action: "refund" },
  { module: "fiscal", action: "cancel" },
  { module: "fiscal", action: "certificate" },
  { module: "fiscal", action: "transmit" },
  { module: "sales", action: "adjust_item" },
  { module: "sales", action: "discount_item" },
  { module: "sales", action: "discount_override" },
  { module: "sales", action: "cancel_item" },
  { module: "sales", action: "transfer_item" },
  { module: "sales", action: "manual_weight" },
  { module: "sales", action: "cancel_order" },
  { module: "sales", action: "merge_tabs" },
  { module: "sales", action: "adjust_order" },
  { module: "stock", action: "adjust" },
  { module: "purchases", action: "receive" },
  { module: "purchases", action: "cancel" },
  { module: "financial", action: "pay" },
  { module: "financial", action: "receive" },
  { module: "financial", action: "reconcile" }
];

const roleGrants: Record<string, string[]> = {
  administrador: permissions.map((permission) => `${permission.module}.${permission.action}`),
  gerente: ["cash.open", "cash.charge", "cash.supply", "cash.withdraw", "cash.cancel", "cash.close", "cash.refund", "sales.adjust_item", "sales.discount_item", "sales.cancel_item", "sales.transfer_item", "sales.manual_weight", "sales.cancel_order", "sales.merge_tabs", "sales.adjust_order", "stock.adjust", "purchases.receive", "purchases.cancel", "financial.pay", "financial.receive", "financial.reconcile"],
  caixa: ["cash.open", "cash.charge", "cash.supply", "cash.withdraw", "cash.close", "sales.adjust_item", "sales.manual_weight"],
  atendente: ["sales.adjust_item"],
  estoque: ["stock.adjust"],
  compras: ["purchases.receive"],
  financeiro: ["financial.pay", "financial.receive", "financial.reconcile"]
};

async function main() {
  const createdPermissions = await Promise.all(
    permissions.map(({ action, module }) =>
      db.permission.upsert({
        where: { module_action: { module, action } },
        create: { action, label: `${module}.${action}`, module },
        update: { label: `${module}.${action}` }
      })
    )
  );
  const permissionsByKey = new Map(
    createdPermissions.map((permission) => [`${permission.module}.${permission.action}`, permission.id])
  );

  for (const [roleName, permissionKeys] of Object.entries(roleGrants)) {
    const role = await db.role.findUniqueOrThrow({ where: { name: roleName } });
    const data = permissionKeys.map((key) => ({
      permissionId: permissionsByKey.get(key)!,
      roleId: role.id
    }));

    await db.rolePermission.createMany({ data, skipDuplicates: true });
  }

  await db.role.updateMany({
    where: { name: "gerente" },
    data: { itemDiscountLimitPercent: 15 }
  });

  console.log("Permissoes sensiveis sincronizadas.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
