import { db } from "@/lib/db";
import { captureScaleReading } from "@/lib/services/operations";

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const productName = `QA Buffet Estavel ${suffix}`;
  const deviceIdentifier = `QA-SCALE-${suffix}`;
  const user = await db.user.findFirstOrThrow({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });
  const category = await db.productCategory.findFirstOrThrow({
    orderBy: { name: "asc" }
  });

  const product = await db.product.create({
    data: {
      categoryId: category.id,
      cost: 22,
      name: productName,
      price: 0,
      pricePerKg: 80,
      sku: `95${suffix}`,
      trackStock: false,
      type: "WEIGHABLE",
      unit: "KG"
    }
  });
  const device = await db.scaleDevice.create({
    data: {
      active: true,
      baudRate: 9600,
      connectionType: "serial",
      identifier: deviceIdentifier,
      minStableReads: 4,
      modelName: "QA Estabilidade",
      name: `QA Balanca Estavel ${suffix}`,
      port: "COM9",
      stabilityMs: 900,
      tareKg: 0.08
    }
  });

  try {
    const reading = await captureScaleReading(
      {
        productId: product.id,
        scaleDeviceId: device.id,
        sourceMode: "DEVICE"
      },
      user.id,
      ["sales.manage"]
    );
    const grossMinusTare = Number((reading.grossWeightKg - reading.tareKg).toFixed(3));
    const expectedTotal = Number((reading.netWeightKg * 80).toFixed(2));
    const results = [
      { label: "peso-liquido", ok: reading.netWeightKg > 0, detail: `${reading.netWeightKg} kg` },
      {
        label: "tara-aplicada",
        ok: reading.tareKg === 0.08 && grossMinusTare === reading.netWeightKg,
        detail: `${reading.grossWeightKg} bruto - ${reading.tareKg} tara = ${reading.netWeightKg} liquido`
      },
      {
        label: "valor-calculado",
        ok: reading.totalPrice === expectedTotal,
        detail: `${reading.totalPrice}`
      }
    ];

    console.table(results);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      throw new Error(`Captura automatica estavel falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Captura automatica de peso estavel aprovada.");
  } finally {
    await db.auditLog.deleteMany({
      where: {
        OR: [{ entityId: product.id }, { entityId: device.id }]
      }
    });
    await db.scaleReading.deleteMany({
      where: { productId: product.id }
    });
    await db.scaleDevice.deleteMany({
      where: { id: device.id }
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
