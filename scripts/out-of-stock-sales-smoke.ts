import { db } from "@/lib/db";
import { createOrAppendSalesOrder } from "@/lib/services/operations";

async function expectStockBlock(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Estoque insuficiente")) {
      return { label, ok: true, detail: message };
    }

    return { label, ok: false, detail: `Mensagem inesperada: ${message}` };
  }

  return { label, ok: false, detail: "Venda sem estoque foi aceita." };
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  await db.recipeItem.deleteMany({
    where: {
      product: {
        name: {
          startsWith: "QA Receita Sem Insumo"
        }
      }
    }
  });
  await db.product.deleteMany({
    where: {
      name: {
        in: [`QA Sem Estoque ${suffix}`, `QA Receita Sem Insumo ${suffix}`]
      }
    }
  });
  await db.product.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "QA Sem Estoque" } },
        { name: { startsWith: "QA Receita Sem Insumo" } }
      ]
    }
  });
  await db.ingredient.deleteMany({
    where: {
      name: {
        startsWith: "QA Insumo Zerado"
      }
    }
  });
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
  const previousBlockSetting = company?.blockOutOfStockSales ?? true;

  const readyProduct = await db.product.create({
    data: {
      categoryId: category.id,
      cost: 5,
      name: `QA Sem Estoque ${suffix}`,
      price: 12,
      sku: `91${suffix}`,
      stockBalance: {
        create: {
          quantity: 0
        }
      },
      trackStock: true,
      type: "READY",
      unit: "UN"
    }
  });
  const ingredient = await db.ingredient.create({
    data: {
      cost: 3,
      currentStock: 0,
      minimumStock: 0,
      name: `QA Insumo Zerado ${suffix}`,
      sku: `92${suffix}`,
      unit: "UN"
    }
  });
  const recipeProduct = await db.product.create({
    data: {
      categoryId: category.id,
      cost: 8,
      name: `QA Receita Sem Insumo ${suffix}`,
      price: 18,
      recipeItems: {
        create: {
          ingredientId: ingredient.id,
          quantity: 1
        }
      },
      sku: `93${suffix}`,
      trackStock: true,
      type: "READY",
      unit: "UN"
    }
  });

  try {
    if (company) {
      await db.companySetting.update({
        where: { id: company.id },
        data: { blockOutOfStockSales: true }
      });
    }

    const results = await Promise.all([
      expectStockBlock("produto-pronto", () =>
        createOrAppendSalesOrder(
          {
            channel: "TAB",
            items: [{ productId: readyProduct.id, quantity: 1 }],
            tabCode: `81${suffix}`
          },
          user.id
        )
      ),
      expectStockBlock("ficha-tecnica", () =>
        createOrAppendSalesOrder(
          {
            channel: "TAB",
            items: [{ productId: recipeProduct.id, quantity: 1 }],
            tabCode: `82${suffix}`
          },
          user.id
        )
      )
    ]);

    console.table(results);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      throw new Error(`Bloqueio de venda sem estoque falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Bloqueio de venda sem estoque aprovado.");
  } finally {
    if (company) {
      await db.companySetting.update({
        where: { id: company.id },
        data: { blockOutOfStockSales: previousBlockSetting }
      });
    }

    await db.recipeItem.deleteMany({
      where: { productId: recipeProduct.id }
    });
    await db.product.deleteMany({
      where: {
        id: { in: [readyProduct.id, recipeProduct.id] }
      }
    });
    await db.ingredient.deleteMany({
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
