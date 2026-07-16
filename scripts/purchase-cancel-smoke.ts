import { db } from "@/lib/db";
import { cancelPurchaseOrder, createPurchaseOrder } from "@/lib/services/purchases";
import { purchaseCancelSchema } from "@/lib/validations/purchases";

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

  const invalidCancel = purchaseCancelSchema.safeParse({
    purchaseOrderId: "teste",
    reason: ""
  });

  if (invalidCancel.success) {
    throw new Error("Cancelamento de compra sem motivo foi aceito.");
  }

  const supplier = await db.supplier.create({
    data: {
      corporateName: `QA Fornecedor Cancelamento ${suffix}`,
      document: `95${suffix}`,
      tradeName: `QA Compra ${suffix}`
    }
  });
  const ingredient = await db.ingredient.create({
    data: {
      cost: 3,
      currentStock: 0,
      minimumStock: 1,
      name: `QA Insumo Compra Cancelada ${suffix}`,
      sku: `96${suffix}`,
      unit: "UN"
    }
  });
  let orderId = "";

  try {
    const order = await createPurchaseOrder(
      {
        ingredientId: ingredient.id,
        notes: "Pedido criado para smoke de cancelamento",
        quantity: 5,
        supplierId: supplier.id,
        unitPrice: 3
      },
      user.id
    );
    orderId = order.id;

    const canceled = await cancelPurchaseOrder(
      {
        purchaseOrderId: order.id,
        reason: "Smoke de cancelamento de compra"
      },
      user.id
    );

    const audit = await db.auditLog.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      where: {
        action: "purchase_order_cancel",
        entityId: order.id,
        module: "purchases"
      }
    });
    const metadata = metadataOf(audit.metadata);

    const checks = [
      {
        check: "pedido fica cancelado",
        ok: canceled.status === "CANCELED"
      },
      {
        check: "auditoria grava motivo",
        ok: metadata.reason === "Smoke de cancelamento de compra"
      },
      {
        check: "auditoria grava status anterior",
        ok: metadata.previousStatus === "APPROVED"
      }
    ];

    console.table(checks);

    const failed = checks.filter((item) => !item.ok);

    if (failed.length > 0) {
      throw new Error(`Cancelamento de compra falhou: ${failed.map((item) => item.check).join(", ")}`);
    }

    console.log("Cancelamento auditado de compra aprovado.");
  } finally {
    await db.auditLog.deleteMany({
      where: {
        OR: [
          {
            entityType: "purchase_order",
            metadata: {
              path: ["supplierId"],
              equals: supplier.id
            }
          },
          {
            entityId: orderId || undefined,
            entityType: "purchase_order",
            module: "purchases"
          }
        ]
      }
    });
    await db.purchaseOrder.deleteMany({
      where: { supplierId: supplier.id }
    });
    await db.ingredient.delete({
      where: { id: ingredient.id }
    });
    await db.supplier.delete({
      where: { id: supplier.id }
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
