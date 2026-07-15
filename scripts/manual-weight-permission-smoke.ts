import { db } from "@/lib/db";
import {
  adjustWeighableSalesOrderItem,
  captureScaleReading,
  createOrAppendSalesOrder
} from "@/lib/services/operations";

async function expectManualWeightBlock(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Lancamento manual de peso esta desabilitado")) {
      return { label, ok: true, detail: message };
    }

    return { label, ok: false, detail: `Mensagem inesperada: ${message}` };
  }

  return { label, ok: false, detail: "Peso manual foi aceito sem permissao." };
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const productName = `QA Peso Manual ${suffix}`;
  const company = await db.companySetting.findFirst({
    orderBy: { createdAt: "asc" }
  });
  const user = await db.user.findFirstOrThrow({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });
  const category = await db.productCategory.findFirstOrThrow({
    orderBy: { name: "asc" }
  });
  const previousAllowManualWeight = company?.allowManualWeightInput ?? true;
  const previousBuffet = company?.enableBuffetKg ?? true;

  const product = await db.product.create({
    data: {
      categoryId: category.id,
      cost: 20,
      name: productName,
      price: 0,
      pricePerKg: 70,
      sku: `94${suffix}`,
      trackStock: false,
      type: "WEIGHABLE",
      unit: "KG"
    }
  });

  const createdOrderIds: string[] = [];
  const createdReadingIds: string[] = [];

  try {
    if (company) {
      await db.companySetting.update({
        where: { id: company.id },
        data: {
          allowManualWeightInput: false,
          enableBuffetKg: true
        }
      });
    }

    const blockedResults = await Promise.all([
      expectManualWeightBlock("pedido-por-peso", () =>
        createOrAppendSalesOrder(
          {
            channel: "TAB",
            items: [{ productId: product.id, quantity: 0.5, weightKg: 0.5 }],
            tabCode: `83${suffix}`
          },
          user.id,
          ["sales.manage"]
        )
      ),
      expectManualWeightBlock("leitura-manual", () =>
        captureScaleReading(
          {
            productId: product.id,
            sourceMode: "MANUAL",
            weightKg: 0.5
          },
          user.id,
          ["sales.manage"]
        )
      )
    ]);

    const order = await createOrAppendSalesOrder(
      {
        channel: "TAB",
        items: [{ productId: product.id, quantity: 0.6, weightKg: 0.6 }],
        tabCode: `84${suffix}`
      },
      user.id,
      ["sales.manage", "scale.manage"]
    );
    createdOrderIds.push(order.id);

    const createdItem = await db.salesOrderItem.findFirstOrThrow({
      where: {
        salesOrderId: order.id,
        productId: product.id
      }
    });

    const blockedAdjustment = await expectManualWeightBlock("ajuste-peso", () =>
      adjustWeighableSalesOrderItem(
        {
          salesOrderItemId: createdItem.id,
          weightKg: 0.65,
          reason: "Teste de bloqueio sem permissao"
        },
        user.id,
        ["sales.manage"]
      )
    );

    const allowedReading = await captureScaleReading(
      {
        productId: product.id,
        sourceMode: "MANUAL",
        weightKg: 0.7
      },
      user.id,
      ["sales.manage", "scale.manage"]
    );
    createdReadingIds.push(allowedReading.id);

    await adjustWeighableSalesOrderItem(
      {
        salesOrderItemId: createdItem.id,
        weightKg: 0.7,
        reason: "Operador autorizado corrigiu o peso"
      },
      user.id,
      ["sales.manage", "cash.manage"]
    );

    const results = [
      ...blockedResults,
      blockedAdjustment,
      {
        label: "leitura-autorizada",
        ok: allowedReading.weightKg === 0.7 && allowedReading.netWeightKg === 0.7 && allowedReading.tareKg === 0,
        detail: `${allowedReading.grossWeightKg} kg bruto | ${allowedReading.tareKg} kg tara | ${allowedReading.netWeightKg} kg liquido`
      },
      { label: "ajuste-autorizado", ok: true, detail: "Peso ajustado por operador autorizado." }
    ];

    console.table(results);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      throw new Error(`Bloqueio de peso manual falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Bloqueio de peso manual por permissao aprovado.");
  } finally {
    if (company) {
      await db.companySetting.update({
        where: { id: company.id },
        data: {
          allowManualWeightInput: previousAllowManualWeight,
          enableBuffetKg: previousBuffet
        }
      });
    }

    await db.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { in: createdOrderIds.length ? createdOrderIds : [""] } },
          { entityId: { in: createdReadingIds.length ? createdReadingIds : [""] } },
          { metadata: { path: ["productName"], equals: productName } }
        ]
      }
    });
    await db.salesOrderItem.deleteMany({
      where: {
        productId: product.id
      }
    });
    await db.salesOrder.deleteMany({
      where: {
        id: { in: createdOrderIds.length ? createdOrderIds : [""] }
      }
    });
    await db.scaleReading.deleteMany({
      where: {
        OR: [{ id: { in: createdReadingIds.length ? createdReadingIds : [""] } }, { productId: product.id }]
      }
    });
    await db.product.deleteMany({
      where: { id: product.id }
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
