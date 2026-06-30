import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "";
}

function nextAvailable(base: string, used: Set<string>, current: string) {
  let next = base || "0";
  let suffix = 1;

  used.delete(current);

  while (used.has(next)) {
    suffix += 1;
    next = `${base || "0"}${suffix}`;
  }

  used.add(next);

  return next;
}

async function main() {
  const usedTableCodes = new Set(
    (await db.restaurantTable.findMany({ select: { code: true } })).map((table) => table.code)
  );
  const usedTabNumbers = new Set((await db.tab.findMany({ select: { number: true } })).map((tab) => tab.number));
  const usedIngredientCodes = new Set(
    (await db.ingredient.findMany({ select: { sku: true } })).map((ingredient) => ingredient.sku)
  );
  const usedCashRegisterCodes = new Set(
    (await db.cashRegister.findMany({ select: { code: true } })).map((register) => register.code)
  );
  const usedSalesOrderNumbers = new Set(
    (await db.salesOrder.findMany({ select: { number: true } })).map((order) => order.number)
  );
  const ingredientSeedCodes = new Map([
    ["Arroz branco", "301"],
    ["Feijao carioca", "302"],
    ["Frango grelhado", "303"]
  ]);

  let tableUpdates = 0;
  let tabUpdates = 0;
  let tabDeactivations = 0;
  let ingredientUpdates = 0;
  let cashRegisterUpdates = 0;
  let salesOrderUpdates = 0;

  for (const table of await db.restaurantTable.findMany()) {
    if (!/\D/.test(table.code)) {
      continue;
    }

    const code = nextAvailable(normalizeDigits(table.code), usedTableCodes, table.code);
    await db.restaurantTable.update({ where: { id: table.id }, data: { code } });
    tableUpdates += 1;
  }

  for (const tab of await db.tab.findMany()) {
    if (!/\D/.test(tab.number)) {
      continue;
    }

    const number = nextAvailable(normalizeDigits(tab.number), usedTabNumbers, tab.number);
    const active = tab.number.startsWith("QA") || tab.number.startsWith("QAFLOW") ? false : tab.active;

    await db.tab.update({ where: { id: tab.id }, data: { active, number } });
    tabUpdates += 1;

    if (!active && tab.active) {
      tabDeactivations += 1;
    }
  }

  for (const ingredient of await db.ingredient.findMany()) {
    if (!/\D/.test(ingredient.sku)) {
      continue;
    }

    const baseCode = ingredientSeedCodes.get(ingredient.name) ?? normalizeDigits(ingredient.sku);
    const sku = nextAvailable(baseCode, usedIngredientCodes, ingredient.sku);

    await db.ingredient.update({ where: { id: ingredient.id }, data: { sku } });
    ingredientUpdates += 1;
  }

  for (const register of await db.cashRegister.findMany()) {
    if (!/\D/.test(register.code)) {
      continue;
    }

    const code = nextAvailable(normalizeDigits(register.code), usedCashRegisterCodes, register.code);
    await db.cashRegister.update({ where: { id: register.id }, data: { code } });
    cashRegisterUpdates += 1;
  }

  for (const order of await db.salesOrder.findMany()) {
    if (!/\D/.test(order.number)) {
      continue;
    }

    const number = nextAvailable(normalizeDigits(order.number), usedSalesOrderNumbers, order.number);
    await db.salesOrder.update({ where: { id: order.id }, data: { number } });
    salesOrderUpdates += 1;
  }

  console.log(
    JSON.stringify(
      {
        cashRegisterUpdates,
        ingredientUpdates,
        salesOrderUpdates,
        tabDeactivations,
        tabUpdates,
        tableUpdates
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
