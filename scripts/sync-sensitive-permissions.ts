import { db } from "@/lib/db";

const permissions = [
  { module: "cash", action: "cancel" },
  { module: "cash", action: "close" },
  { module: "cash", action: "refund" },
  { module: "fiscal", action: "cancel" },
  { module: "fiscal", action: "certificate" },
  { module: "fiscal", action: "transmit" },
  { module: "sales", action: "adjust_item" },
  { module: "sales", action: "cancel_item" },
  { module: "sales", action: "transfer_item" },
  { module: "sales", action: "manual_weight" },
  { module: "sales", action: "cancel_order" },
  { module: "sales", action: "merge_tabs" },
  { module: "sales", action: "adjust_order" }
];

const roleGrants: Record<string, string[]> = {
  administrador: permissions.map((permission) => `${permission.module}.${permission.action}`),
  gerente: ["cash.cancel", "cash.close", "cash.refund", "sales.adjust_item", "sales.cancel_item", "sales.transfer_item", "sales.manual_weight", "sales.cancel_order", "sales.merge_tabs", "sales.adjust_order"],
  caixa: ["cash.close", "sales.adjust_item", "sales.manual_weight"],
  atendente: ["sales.adjust_item"]
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
