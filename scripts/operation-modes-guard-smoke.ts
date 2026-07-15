import { db } from "@/lib/db";
import { createOrAppendSalesOrder, launchScaleSale } from "@/lib/services/operations";

type CompanyModeSnapshot = {
  enableBuffetKg: boolean;
  enableCounter: boolean;
  enableDelivery: boolean;
  enableTableService: boolean;
  enableTakeout: boolean;
};

async function expectBlock(label: string, action: () => Promise<unknown>, expectedText: string) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes(expectedText)) {
      return { label, ok: true, detail: message };
    }

    return { label, ok: false, detail: `Mensagem inesperada: ${message}` };
  }

  return { label, ok: false, detail: "Operacao foi aceita, mas deveria ser bloqueada." };
}

async function main() {
  const company = await db.companySetting.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (!company) {
    throw new Error("Configuracao da empresa nao encontrada para o smoke de modos operacionais.");
  }

  const snapshot: CompanyModeSnapshot = {
    enableBuffetKg: company.enableBuffetKg,
    enableCounter: company.enableCounter,
    enableDelivery: company.enableDelivery,
    enableTableService: company.enableTableService,
    enableTakeout: company.enableTakeout
  };

  const [user, readyProduct, weighableProduct] = await Promise.all([
    db.user.findFirstOrThrow({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" }
    }),
    db.product.findFirstOrThrow({
      where: {
        active: true,
        type: {
          not: "WEIGHABLE"
        }
      },
      orderBy: { name: "asc" }
    }),
    db.product.findFirstOrThrow({
      where: {
        active: true,
        type: "WEIGHABLE"
      },
      orderBy: { name: "asc" }
    })
  ]);

  try {
    await db.companySetting.update({
      where: { id: company.id },
      data: {
        enableBuffetKg: false,
        enableCounter: false,
        enableDelivery: false,
        enableTableService: false,
        enableTakeout: false
      }
    });

    const results = await Promise.all([
      expectBlock(
        "balcao",
        () =>
          createOrAppendSalesOrder(
            {
              channel: "COUNTER",
              items: [{ productId: readyProduct.id, quantity: 1 }]
            },
            user.id
          ),
        "balcao/PDV"
      ),
      expectBlock(
        "mesa",
        () =>
          createOrAppendSalesOrder(
            {
              channel: "TABLE",
              items: [{ productId: readyProduct.id, quantity: 1 }],
              tableId: "mesa-inexistente"
            },
            user.id
          ),
        "Atendimento por mesa"
      ),
      expectBlock(
        "retirada",
        () =>
          createOrAppendSalesOrder(
            {
              channel: "TAKEOUT",
              items: [{ productId: readyProduct.id, quantity: 1 }]
            },
            user.id
          ),
        "Retirada"
      ),
      expectBlock(
        "delivery",
        () =>
          createOrAppendSalesOrder(
            {
              channel: "DELIVERY",
              items: [{ productId: readyProduct.id, quantity: 1 }]
            },
            user.id
          ),
        "Delivery"
      ),
      expectBlock(
        "buffet-por-quilo",
        () =>
          launchScaleSale(
            {
              productId: weighableProduct.id,
              sourceMode: "MANUAL",
              targetCode: "99001",
              targetType: "TAB",
              weightKg: 0.575
            },
            user.id
          ),
        "Venda por quilo"
      )
    ]);

    console.table(results);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      throw new Error(`Bloqueio de modos falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Bloqueios por modo operacional aprovados.");
  } finally {
    await db.companySetting.update({
      where: { id: company.id },
      data: snapshot
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
