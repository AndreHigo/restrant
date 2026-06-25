import { Prisma, StockMovementType } from "@prisma/client";
import { db } from "@/lib/db";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

async function writeAudit(
  userId: string,
  module: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue
) {
  await db.auditLog.create({
    data: {
      userId,
      module,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

function movementFactor(type: StockMovementType) {
  if (type === "IN" || type === "PURCHASE") {
    return 1;
  }

  if (type === "OUT" || type === "LOSS") {
    return -1;
  }

  return 0;
}

export async function listStockOverview() {
  const now = new Date();
  const expirationLimit = new Date(now);
  expirationLimit.setDate(expirationLimit.getDate() + 7);

  const ingredients = await db.ingredient.findMany({
    include: {
      stockMovements: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  const lowStockCount = ingredients.filter(
    (item) => decimalToNumber(item.currentStock) <= decimalToNumber(item.minimumStock)
  ).length;
  const expiredCount = ingredients.filter((item) => item.expiresAt && item.expiresAt < now).length;
  const expiringSoonCount = ingredients.filter(
    (item) => item.expiresAt && item.expiresAt >= now && item.expiresAt <= expirationLimit
  ).length;

  const totalValue = ingredients.reduce(
    (sum, item) => sum + decimalToNumber(item.currentStock) * decimalToNumber(item.cost),
    0
  );

  return {
    kpis: {
      ingredientsCount: ingredients.length,
      lowStockCount,
      totalValue,
      expiringCount: expiringSoonCount,
      expiredCount
    },
    items: ingredients.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      cost: decimalToNumber(item.cost),
      currentStock: decimalToNumber(item.currentStock),
      minimumStock: decimalToNumber(item.minimumStock),
      expiresAt: item.expiresAt?.toISOString() ?? "",
      belowMinimum: decimalToNumber(item.currentStock) <= decimalToNumber(item.minimumStock),
      expired: Boolean(item.expiresAt && item.expiresAt < now),
      expiringSoon: Boolean(item.expiresAt && item.expiresAt >= now && item.expiresAt <= expirationLimit),
      coverageRatio:
        decimalToNumber(item.minimumStock) > 0
          ? Number((decimalToNumber(item.currentStock) / decimalToNumber(item.minimumStock)).toFixed(2))
          : null,
      latestMovement: item.stockMovements[0]
        ? {
            type: item.stockMovements[0].type,
            quantity: decimalToNumber(item.stockMovements[0].quantity),
            createdAt: item.stockMovements[0].createdAt.toISOString()
          }
        : null
    })),
    lowStockItems: ingredients
      .filter((item) => decimalToNumber(item.currentStock) <= decimalToNumber(item.minimumStock))
      .map((item) => ({
        id: item.id,
        name: item.name,
        currentStock: decimalToNumber(item.currentStock),
        minimumStock: decimalToNumber(item.minimumStock),
        unit: item.unit
      })),
    expiringItems: ingredients
      .filter((item) => Boolean(item.expiresAt && item.expiresAt <= expirationLimit))
      .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))
      .map((item) => ({
        id: item.id,
        name: item.name,
        currentStock: decimalToNumber(item.currentStock),
        unit: item.unit,
        expiresAt: item.expiresAt?.toISOString() ?? "",
        expired: Boolean(item.expiresAt && item.expiresAt < now)
      }))
  };
}

export async function createStockMovement(
  data: {
    ingredientId: string;
    type: "IN" | "OUT" | "ADJUSTMENT" | "LOSS" | "PURCHASE";
    quantity: number;
    unitCost?: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: data.ingredientId }
    });

    const factor = movementFactor(data.type);
    const nextStock =
      decimalToNumber(ingredient.currentStock) + factor * decimalToNumber(data.quantity);

    if (nextStock < 0) {
      throw new Error("A movimentacao deixaria o estoque negativo.");
    }

    const movement = await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost ?? null,
        reason: data.reason || null,
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null
      }
    });

    await tx.ingredient.update({
      where: { id: data.ingredientId },
      data: {
        currentStock: nextStock,
        cost: data.unitCost ?? ingredient.cost
      }
    });

    await writeAudit(userId, "stock", "movement_create", "stock_movement", movement.id, {
      ingredientId: data.ingredientId,
      type: data.type,
      quantity: data.quantity
    });

    return movement;
  });
}

export async function applyInventoryAdjustment(
  data: {
    ingredientId: string;
    countedStock: number;
    reason?: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: data.ingredientId }
    });

    const current = decimalToNumber(ingredient.currentStock);
    const difference = data.countedStock - current;

    const movement = await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: "INVENTORY",
        quantity: Math.abs(difference),
        unitCost: ingredient.cost,
        reason: data.reason || "Ajuste de inventario",
        referenceType: "inventory",
        referenceId: ingredient.id
      }
    });

    await tx.ingredient.update({
      where: { id: data.ingredientId },
      data: {
        currentStock: data.countedStock
      }
    });

    await writeAudit(userId, "stock", "inventory_adjustment", "stock_movement", movement.id, {
      ingredientId: data.ingredientId,
      previousStock: current,
      countedStock: data.countedStock,
      difference
    });

    return movement;
  });
}

export async function listRecipes() {
  const products = await db.product.findMany({
    include: {
      category: true,
      recipeItems: {
        include: {
          ingredient: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    where: {
      active: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category.name,
    recipeCount: product.recipeItems.length,
    recipeItems: product.recipeItems.map((item) => ({
      id: item.id,
      ingredientName: item.ingredient.name,
      ingredientUnit: item.ingredient.unit,
      quantity: decimalToNumber(item.quantity)
    }))
  }));
}

export async function createRecipeItem(
  data: {
    productId: string;
    ingredientId: string;
    quantity: number;
  },
  userId: string
) {
  const item = await db.recipeItem.upsert({
    where: {
      productId_ingredientId: {
        productId: data.productId,
        ingredientId: data.ingredientId
      }
    },
    create: data,
    update: {
      quantity: data.quantity
    }
  });

  await writeAudit(userId, "stock", "recipe_item_upsert", "recipe_item", item.id, data);
  return item;
}
