import { db } from "@/lib/db";
import { createStockMovement, applyInventoryAdjustment } from "@/lib/services/stock";
import { inventoryAdjustmentSchema, stockMovementSchema } from "@/lib/validations/stock";

function metadataOf(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const user = await db.user.findFirstOrThrow({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });

  const missingMovementReason = stockMovementSchema.safeParse({
    ingredientId: "teste",
    quantity: 1,
    reason: "",
    type: "OUT"
  });
  const missingInventoryReason = inventoryAdjustmentSchema.safeParse({
    countedStock: 10,
    ingredientId: "teste",
    reason: ""
  });

  if (missingMovementReason.success || missingInventoryReason.success) {
    throw new Error("Validacao de motivo obrigatorio para ajuste manual de estoque falhou.");
  }

  const ingredient = await db.ingredient.create({
    data: {
      cost: 4,
      currentStock: 10,
      minimumStock: 2,
      name: `QA Auditoria Estoque ${suffix}`,
      sku: `94${suffix}`,
      unit: "KG"
    }
  });

  try {
    const movement = await createStockMovement(
      {
        ingredientId: ingredient.id,
        quantity: 2,
        reason: "Teste de auditoria de saida",
        type: "OUT"
      },
      user.id
    );

    const movementAudit = await db.auditLog.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      where: {
        action: "movement_create",
        entityId: movement.id,
        module: "stock"
      }
    });
    const movementMetadata = metadataOf(movementAudit.metadata);

    const inventory = await applyInventoryAdjustment(
      {
        countedStock: 12,
        ingredientId: ingredient.id,
        reason: "Teste de auditoria de inventario"
      },
      user.id
    );

    const inventoryAudit = await db.auditLog.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      where: {
        action: "inventory_adjustment",
        entityId: inventory.id,
        module: "stock"
      }
    });
    const inventoryMetadata = metadataOf(inventoryAudit.metadata);

    const stockAfter = await db.ingredient.findUniqueOrThrow({
      where: { id: ingredient.id }
    });

    const checks = [
      {
        check: "movimentacao grava saldo anterior",
        ok: movementMetadata.previousStock === 10
      },
      {
        check: "movimentacao grava saldo novo",
        ok: movementMetadata.nextStock === 8
      },
      {
        check: "movimentacao grava motivo",
        ok: movementMetadata.reason === "Teste de auditoria de saida"
      },
      {
        check: "inventario grava saldo anterior",
        ok: inventoryMetadata.previousStock === 8
      },
      {
        check: "inventario grava saldo contado",
        ok: inventoryMetadata.countedStock === 12
      },
      {
        check: "inventario atualiza estoque",
        ok: Number(stockAfter.currentStock) === 12
      }
    ];

    console.table(checks);

    const failed = checks.filter((item) => !item.ok);

    if (failed.length > 0) {
      throw new Error(`Auditoria de estoque falhou: ${failed.map((item) => item.check).join(", ")}`);
    }

    console.log("Auditoria de ajuste manual de estoque aprovada.");
  } finally {
    await db.auditLog.deleteMany({
      where: {
        module: "stock",
        metadata: {
          path: ["ingredientId"],
          equals: ingredient.id
        }
      }
    });
    await db.stockMovement.deleteMany({
      where: { ingredientId: ingredient.id }
    });
    await db.ingredient.delete({
      where: { id: ingredient.id }
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
