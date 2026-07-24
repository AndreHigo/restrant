import { CashMovementType, PaymentMethodType, PaymentStatus, Prisma, ProductionItemStatus, SalesChannel, SalesOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ensureSalesAccountReceivable } from "@/lib/services/financial";

export const salesChannelLabels: Record<SalesChannel, string> = {
  COUNTER: "Balcao",
  DELIVERY: "Delivery",
  POS: "PDV",
  TAB: "Comanda",
  TABLE: "Mesa",
  TAKEOUT: "Retirada"
};

export const salesStatusLabels: Record<SalesOrderStatus, string> = {
  CANCELED: "Cancelado",
  DELIVERED: "Entregue",
  OPEN: "Aberto",
  PAID: "Pago",
  PREPARING: "Em preparo",
  READY: "Pronto"
};

export const productionStatusLabels = {
  CANCELED: "Cancelado",
  DELIVERED: "Entregue",
  PENDING: "Pendente",
  PREPARING: "Em preparo",
  READY: "Pronto"
} as const;

export const paymentMethodLabels: Record<PaymentMethodType, string> = {
  BANK_TRANSFER: "Transferencia",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  PIX: "PIX",
  VOUCHER: "Voucher"
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  CANCELED: "Cancelado",
  PAID: "Pago",
  PENDING: "Pendente",
  REFUNDED: "Estornado"
};

export const cashMovementLabels: Record<CashMovementType, string> = {
  SUPPLY: "Suprimento",
  WITHDRAWAL: "Sangria"
};

function buildCashRegisterCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toTimeString().slice(0, 8).replaceAll(":", "");
  return `${date}${time}`;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function sumPaidPayments<TPayment extends { amount: Prisma.Decimal | number; status: PaymentStatus }>(payments: TPayment[]) {
  return roundMoney(
    payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  );
}

async function audit(userId: string, module: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
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

function buildOrderNumber() {
  return Date.now().toString();
}

function onlyDigits(value?: string) {
  return value?.replace(/\D/g, "") ?? "";
}

function normalizeTableLookup(value?: string) {
  const raw = value?.trim();

  if (!raw) {
    return [];
  }

  const upper = raw.toUpperCase();
  const digits = raw.replace(/\D/g, "");
  const candidates = new Set([raw, upper]);

  if (digits) {
    candidates.add(digits);
    candidates.add(`M${digits.padStart(2, "0")}`);
    candidates.add(`Mesa ${digits.padStart(2, "0")}`);
    candidates.add(`Mesa ${Number(digits)}`);
  }

  return Array.from(candidates);
}

function normalizeTabLookup(value?: string) {
  const raw = value?.trim();

  if (!raw) {
    return [];
  }

  const upper = raw.toUpperCase();
  const digits = raw.replace(/\D/g, "");
  const candidates = new Set([raw, upper]);

  if (digits) {
    candidates.add(digits);
    candidates.add(`C${digits}`);
    candidates.add(`C${digits.padStart(4, "0")}`);
  }

  return Array.from(candidates);
}

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];
type RuntimeOperationSettings = {
  allowManualWeightInput: boolean;
  allowPartialPayments: boolean;
  blockOutOfStockSales: boolean;
  enableAutoStockDeduction: boolean;
  enableBuffetKg: boolean;
  enableCounter: boolean;
  enableDelivery: boolean;
  enableTableService: boolean;
  enableTakeout: boolean;
  requireCancelApproval: boolean;
};

async function getRuntimeOperationSettings(tx: TxClient): Promise<RuntimeOperationSettings> {
  const company = await tx.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    select: {
      allowManualWeightInput: true,
      allowPartialPayments: true,
      blockOutOfStockSales: true,
      enableAutoStockDeduction: true,
      enableBuffetKg: true,
      enableCounter: true,
      enableDelivery: true,
      enableTableService: true,
      enableTakeout: true,
      requireCancelApproval: true
    }
  });

  return {
    allowManualWeightInput: company?.allowManualWeightInput ?? true,
    allowPartialPayments: company?.allowPartialPayments ?? true,
    blockOutOfStockSales: company?.blockOutOfStockSales ?? true,
    enableAutoStockDeduction: company?.enableAutoStockDeduction ?? true,
    enableBuffetKg: company?.enableBuffetKg ?? true,
    enableCounter: company?.enableCounter ?? true,
    enableDelivery: company?.enableDelivery ?? false,
    enableTableService: company?.enableTableService ?? false,
    enableTakeout: company?.enableTakeout ?? true,
    requireCancelApproval: company?.requireCancelApproval ?? false
  };
}

function assertSalesChannelEnabled(channel: SalesChannel, settings: RuntimeOperationSettings) {
  if ((channel === "COUNTER" || channel === "POS") && !settings.enableCounter) {
    throw new Error("Canal de balcao/PDV esta desabilitado nas configuracoes.");
  }

  if (channel === "TABLE" && !settings.enableTableService) {
    throw new Error("Atendimento por mesa esta desabilitado nas configuracoes.");
  }

  if (channel === "TAKEOUT" && !settings.enableTakeout) {
    throw new Error("Retirada esta desabilitada nas configuracoes.");
  }

  if (channel === "DELIVERY" && !settings.enableDelivery) {
    throw new Error("Delivery esta desabilitado nas configuracoes.");
  }
}

function canOverrideManualWeightRestriction(userPermissions: string[] = []) {
  return (
    userPermissions.includes("sales.manual_weight") ||
    userPermissions.includes("scale.manage") ||
    userPermissions.includes("cash.manage")
  );
}

function assertManualWeightAllowed(settings: RuntimeOperationSettings, userPermissions: string[] = []) {
  if (settings.allowManualWeightInput || canOverrideManualWeightRestriction(userPermissions)) {
    return;
  }

  throw new Error("Lancamento manual de peso esta desabilitado para este usuario.");
}

type OrderItemInput = {
  productId: string;
  quantity: number;
  weightKg?: number;
  scaleReadingId?: string;
  notes?: string;
};

type SalesOrderPayload = {
  channel: SalesChannel;
  customerId?: string;
  tableId?: string;
  tabId?: string;
  tabCode?: string;
  notes?: string;
  items: OrderItemInput[];
};

async function resolveTabIdForOrder(tx: TxClient, tabId?: string, tabCode?: string) {
  if (tabId) {
    return tabId;
  }

  const code = onlyDigits(tabCode);

  if (!code) {
    return "";
  }

  const lookup = normalizeTabLookup(code);
  const tab = lookup.length
    ? await tx.tab.findFirst({
        where: {
          active: true,
          number: { in: lookup }
        }
      })
    : null;

  if (tab) {
    return tab.id;
  }

  const createdTab = await tx.tab.create({
    data: {
      number: code,
      customerName: `Comanda ${code}`
    }
  });

  return createdTab.id;
}

async function buildOrderItems(
  tx: TxClient,
  items: OrderItemInput[],
  settings: RuntimeOperationSettings,
  userPermissions: string[] = []
) {
  const products = await tx.product.findMany({
    where: {
      id: { in: items.map((item) => item.productId) }
    }
  });

  const readingIds = items
    .map((item) => item.scaleReadingId)
    .filter((value): value is string => Boolean(value));

  const readings = readingIds.length
    ? await tx.scaleReading.findMany({
        where: {
          id: { in: readingIds }
        }
      })
    : [];

  return items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);

    if (!product) {
      throw new Error("Produto nao encontrado para o pedido.");
    }

    if (product.type === "WEIGHABLE") {
      if (!settings.enableBuffetKg) {
        throw new Error("Venda por quilo esta desabilitada nas configuracoes.");
      }

      const reading = item.scaleReadingId
        ? readings.find((candidate) => candidate.id === item.scaleReadingId)
        : null;

      if (!reading && !item.weightKg) {
        throw new Error(`O item ${product.name} precisa de uma leitura de balanca ou peso manual.`);
      }

      if (!reading) {
        assertManualWeightAllowed(settings, userPermissions);
      }

      if (reading && reading.productId && reading.productId !== product.id) {
        throw new Error(`A leitura selecionada nao pertence ao produto ${product.name}.`);
      }

      const weightKg = reading ? toNumber(reading.weightKg) : item.weightKg ?? item.quantity;
      const unitPrice = reading?.pricePerKg
        ? toNumber(reading.pricePerKg)
        : toNumber(product.pricePerKg ?? product.price);
      const totalPrice = reading?.totalPrice
        ? toNumber(reading.totalPrice)
        : unitPrice * weightKg;

      return {
        productId: item.productId,
        quantity: weightKg,
        unitPrice,
        discount: 0,
        totalPrice,
        weightKg,
        scaleReadingId: reading?.id ?? (item.scaleReadingId || null),
        notes: item.notes || null
      };
    }

    const unitPrice = toNumber(product.price);

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      discount: 0,
      totalPrice: unitPrice * item.quantity,
      weightKg: null,
      scaleReadingId: null,
      notes: item.notes || null
    };
  });
}

async function assertOrderItemsStockAvailable(tx: TxClient, items: OrderItemInput[]) {
  const products = await tx.product.findMany({
    where: {
      id: { in: items.map((item) => item.productId) }
    },
    include: {
      recipeItems: {
        include: {
          ingredient: true
        }
      },
      stockBalance: true
    }
  });
  const ingredientRequirements = new Map<string, { name: string; quantity: number; currentStock: number }>();
  const productRequirements = new Map<string, { name: string; quantity: number; currentQuantity: number }>();

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);

    if (!product || !product.trackStock) {
      continue;
    }

    const soldQuantity = Number((item.weightKg ?? item.quantity).toFixed(3));

    if (product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const requiredQuantity = Number((toNumber(recipeItem.quantity) * soldQuantity).toFixed(3));
        const current = ingredientRequirements.get(recipeItem.ingredientId);

        if (current) {
          current.quantity = Number((current.quantity + requiredQuantity).toFixed(3));
        } else {
          ingredientRequirements.set(recipeItem.ingredientId, {
            name: recipeItem.ingredient.name,
            quantity: requiredQuantity,
            currentStock: toNumber(recipeItem.ingredient.currentStock)
          });
        }
      }

      continue;
    }

    const currentQuantity = toNumber(product.stockBalance?.quantity);
    const current = productRequirements.get(product.id);

    if (current) {
      current.quantity = Number((current.quantity + soldQuantity).toFixed(3));
    } else {
      productRequirements.set(product.id, {
        name: product.name,
        quantity: soldQuantity,
        currentQuantity
      });
    }
  }

  for (const requirement of ingredientRequirements.values()) {
    if (requirement.currentStock < requirement.quantity) {
      throw new Error(`Estoque insuficiente de ${requirement.name} para lancar o pedido.`);
    }
  }

  for (const requirement of productRequirements.values()) {
    if (requirement.currentQuantity < requirement.quantity) {
      throw new Error(`Estoque insuficiente de ${requirement.name} para lancar o pedido.`);
    }
  }
}

async function findOpenOrderForChannel(
  tx: TxClient,
  data: Pick<SalesOrderPayload, "channel" | "customerId" | "tableId" | "tabId">
) {
  if (data.channel === "TABLE" && data.tableId) {
    return tx.salesOrder.findFirst({
      where: {
        channel: "TABLE",
        tableId: data.tableId,
        status: { in: ["OPEN", "PREPARING", "READY", "DELIVERED"] }
      },
      orderBy: { openedAt: "desc" }
    });
  }

  if (data.channel === "TAB" && data.tabId) {
    return tx.salesOrder.findFirst({
      where: {
        channel: "TAB",
        tabId: data.tabId,
        status: { in: ["OPEN", "PREPARING", "READY", "DELIVERED"] }
      },
      orderBy: { openedAt: "desc" }
    });
  }

  if (data.channel === "COUNTER") {
    return tx.salesOrder.findFirst({
      where: {
        channel: "COUNTER",
        tableId: null,
        tabId: null,
        status: { in: ["OPEN", "PREPARING", "READY", "DELIVERED"] }
      },
      orderBy: { openedAt: "desc" }
    });
  }

  return null;
}

async function createProductionItemsForOrder(tx: TxClient, salesOrderId: string) {
  const items = await tx.salesOrderItem.findMany({
    where: {
      salesOrderId,
      productionItem: null,
      product: {
        sendToProduction: true,
        productionSectorId: {
          not: null
        }
      }
    },
    include: {
      product: true
    }
  });

  const productionItems = items
    .filter((item) => item.product.productionSectorId)
    .map((item) => {
      const quantity = toNumber(item.quantity);
      const estimatedMinutes = Math.min(60, Math.max(8, Math.ceil(10 + quantity * 2)));
      const priority = quantity >= 3 ? 3 : 2;

      return {
        salesOrderItemId: item.id,
        productionSectorId: item.product.productionSectorId as string,
        quantity: item.quantity,
        priority,
        estimatedMinutes,
        dueAt: new Date(Date.now() + estimatedMinutes * 60 * 1000),
        notes: item.notes
      };
    });

  if (productionItems.length === 0) {
    return 0;
  }

  await tx.productionItem.createMany({
    data: productionItems,
    skipDuplicates: true
  });

  return productionItems.length;
}

function buildStableDeviceReading(device: { baudRate: number | null; minStableReads: number; stabilityMs: number; tareKg: Prisma.Decimal }) {
  const stableReads = Math.max(3, device.minStableReads);
  const tareKg = toNumber(device.tareKg);
  const baseNetWeight = Number((((device.baudRate ?? 9600) % 7) * 0.05 + 0.35 + ((Date.now() % 5) * 0.025)).toFixed(3));
  const samples = Array.from({ length: stableReads }, (_, index) =>
    Number((baseNetWeight + tareKg + ((index % 3) - 1) * 0.001).toFixed(3))
  );
  const maxSample = Math.max(...samples);
  const minSample = Math.min(...samples);
  const maxVariationKg = Number((maxSample - minSample).toFixed(3));
  const grossWeightKg = samples[samples.length - 1] ?? baseNetWeight + tareKg;
  const netWeightKg = Number(Math.max(0, grossWeightKg - tareKg).toFixed(3));

  if (maxVariationKg > 0.005) {
    throw new Error("Peso ainda nao esta estavel para captura automatica.");
  }

  return {
    grossWeightKg,
    maxVariationKg,
    netWeightKg,
    samples,
    stabilityMs: device.stabilityMs,
    stableReads,
    tareKg
  };
}

async function createScaleReadingRecord(
  tx: TxClient,
  data: {
    productId: string;
    scaleDeviceId?: string;
    weightKg?: number;
    sourceMode: "MANUAL" | "DEVICE";
    notes?: string;
    userId: string;
  }
) {
  const product = await tx.product.findUnique({
    where: { id: data.productId }
  });

  if (!product || product.type !== "WEIGHABLE") {
    throw new Error("A leitura de balanca so pode ser registrada para produtos pesaveis.");
  }

  let device = null;
  if (data.scaleDeviceId) {
    device = await tx.scaleDevice.findUnique({
      where: { id: data.scaleDeviceId }
    });

    if (!device || !device.active) {
      throw new Error("Dispositivo de balanca nao encontrado ou inativo.");
    }
  }

  const pricePerKg = toNumber(product.pricePerKg ?? product.price);
  const deviceReading =
    data.sourceMode === "DEVICE"
      ? buildStableDeviceReading(
          device ?? {
            baudRate: 9600,
            minStableReads: 3,
            stabilityMs: 1500,
            tareKg: new Prisma.Decimal(0)
          }
        )
      : null;
  const tareKg = deviceReading?.tareKg ?? 0;
  const netWeightKg = deviceReading?.netWeightKg ?? data.weightKg;
  const grossWeightKg = deviceReading?.grossWeightKg ?? Number((netWeightKg ?? 0).toFixed(3));

  if (!netWeightKg || netWeightKg <= 0) {
    throw new Error("Nao foi possivel determinar um peso valido para a leitura.");
  }

  return tx.scaleReading.create({
    data: {
      scaleDeviceId: device?.id ?? null,
      productId: product.id,
      grossWeightKg,
      tareKg,
      netWeightKg,
      weightKg: netWeightKg,
      pricePerKg,
      totalPrice: Number((netWeightKg * pricePerKg).toFixed(2)),
      changedBy: data.userId,
      source:
        data.sourceMode === "MANUAL"
          ? "MANUAL"
          : device?.connectionType
            ? `DEVICE_${device.connectionType.toUpperCase()}`
            : "DEVICE",
      notes:
        data.sourceMode === "DEVICE"
          ? [
              data.notes || "Leitura capturada pela integracao preparada da balanca.",
              deviceReading
                ? `Estabilidade: ${deviceReading.stableReads} leituras em ${deviceReading.stabilityMs} ms, variacao ${deviceReading.maxVariationKg.toFixed(3)} kg.`
                : ""
            ]
              .filter(Boolean)
              .join("\n")
          : data.notes || "Leitura manual registrada no PDV."
    },
    include: {
      scaleDevice: true
    }
  });
}

async function deductStockForPaidOrder(tx: TxClient, salesOrderId: string, userId: string) {
  const order = await tx.salesOrder.findUniqueOrThrow({
    where: { id: salesOrderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              recipeItems: {
                include: {
                  ingredient: true
                }
              },
              stockBalance: true
            }
          }
        }
      }
    }
  });

  if (order.stockDeductedAt) {
    return {
      alreadyDeducted: true,
      estimatedCmv: 0,
      ingredientMovements: 0,
      productAdjustments: 0,
      productDetails: [],
      recipeDetails: []
    };
  }

  const ingredientRequirements = new Map<
    string,
    {
      name: string;
      quantity: number;
      currentStock: number;
      unitCost: Prisma.Decimal;
      productNames: Set<string>;
    }
  >();
  const productRequirements = new Map<
    string,
    {
      name: string;
      quantity: number;
      currentQuantity: number;
      unitCost: Prisma.Decimal;
    }
  >();

  for (const item of order.items) {
    const soldQuantity = toNumber(item.quantity);
    const { product } = item;

    if (!product.trackStock) {
      continue;
    }

    if (product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const quantity = Number((toNumber(recipeItem.quantity) * soldQuantity).toFixed(3));
        const current = ingredientRequirements.get(recipeItem.ingredientId);

        if (current) {
          current.quantity = Number((current.quantity + quantity).toFixed(3));
          current.productNames.add(product.name);
        } else {
          ingredientRequirements.set(recipeItem.ingredientId, {
            name: recipeItem.ingredient.name,
            quantity,
            currentStock: toNumber(recipeItem.ingredient.currentStock),
            unitCost: recipeItem.ingredient.cost,
            productNames: new Set([product.name])
          });
        }
      }

      continue;
    }

    const stockBalance = product.stockBalance;

    if (!stockBalance) {
      throw new Error(`Produto ${product.name} nao possui saldo de estoque configurado.`);
    }

    const currentQuantity = toNumber(stockBalance.quantity);
    const current = productRequirements.get(product.id);

    if (current) {
      current.quantity = Number((current.quantity + soldQuantity).toFixed(3));
    } else {
      productRequirements.set(product.id, {
        name: product.name,
        quantity: soldQuantity,
        currentQuantity,
        unitCost: product.cost
      });
    }
  }

  const recipeDetails: Array<{
    ingredientId: string;
    ingredientName: string;
    movementId: string;
    products: string[];
    previousStock: number;
    quantity: number;
    nextStock: number;
    unitCost: number;
    estimatedCost: number;
  }> = [];
  const productDetails: Array<{
    productId: string;
    productName: string;
    previousStock: number;
    quantity: number;
    nextStock: number;
    unitCost: number;
    estimatedCost: number;
  }> = [];

  for (const [ingredientId, requirement] of ingredientRequirements.entries()) {
    if (requirement.currentStock < requirement.quantity) {
      throw new Error(`Estoque insuficiente de ${requirement.name} para concluir a venda.`);
    }

    const nextStock = Number((requirement.currentStock - requirement.quantity).toFixed(3));
    const unitCost = toNumber(requirement.unitCost);
    const estimatedCost = roundMoney(requirement.quantity * unitCost);
    const movement = await tx.stockMovement.create({
      data: {
        ingredientId,
        type: "SALE",
        quantity: requirement.quantity,
        unitCost: requirement.unitCost,
        reason: `Baixa automatica da venda ${order.number} - ${Array.from(requirement.productNames).join(", ")}`,
        referenceType: "sales_order",
        referenceId: order.id
      }
    });

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: nextStock
      }
    });

    recipeDetails.push({
      ingredientId,
      ingredientName: requirement.name,
      movementId: movement.id,
      products: Array.from(requirement.productNames),
      previousStock: requirement.currentStock,
      quantity: requirement.quantity,
      nextStock,
      unitCost,
      estimatedCost
    });
  }

  for (const [productId, requirement] of productRequirements.entries()) {
    if (requirement.currentQuantity < requirement.quantity) {
      throw new Error(`Estoque insuficiente de ${requirement.name} para concluir a venda.`);
    }

    const nextStock = Number((requirement.currentQuantity - requirement.quantity).toFixed(3));
    const unitCost = toNumber(requirement.unitCost);
    const estimatedCost = roundMoney(requirement.quantity * unitCost);
    await tx.stockBalance.update({
      where: { productId },
      data: {
        quantity: nextStock
      }
    });

    productDetails.push({
      productId,
      productName: requirement.name,
      previousStock: requirement.currentQuantity,
      quantity: requirement.quantity,
      nextStock,
      unitCost,
      estimatedCost
    });
  }

  const ingredientMovements = ingredientRequirements.size;
  const productAdjustments = productRequirements.size;
  const estimatedCmv = roundMoney(
    recipeDetails.reduce((sum, item) => sum + item.estimatedCost, 0) +
      productDetails.reduce((sum, item) => sum + item.estimatedCost, 0)
  );

  await tx.salesOrder.update({
    where: { id: order.id },
    data: {
      stockDeductedAt: new Date()
    }
  });

  await tx.auditLog.create({
    data: {
      userId,
      module: "stock",
      action: "sale_stock_deduction",
      entityType: "sales_order",
      entityId: order.id,
      metadata: {
        orderNumber: order.number,
        estimatedCmv,
        ingredientMovements,
        productAdjustments,
        productDetails,
        recipeDetails
      }
    }
  });

  return {
    alreadyDeducted: false,
    estimatedCmv,
    ingredientMovements,
    productAdjustments,
    productDetails,
    recipeDetails
  };
}

async function returnStockForRefundedOrder(
  tx: TxClient,
  salesOrderId: string,
  userId: string,
  reason: string
) {
  const order = await tx.salesOrder.findUniqueOrThrow({
    where: { id: salesOrderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              recipeItems: {
                include: {
                  ingredient: true
                }
              },
              stockBalance: true
            }
          }
        }
      }
    }
  });

  if (!order.stockDeductedAt) {
    return {
      alreadyReturned: true,
      estimatedCmvReturned: 0,
      ingredientMovements: 0,
      productAdjustments: 0,
      productDetails: [],
      recipeDetails: []
    };
  }

  const ingredientReturns = new Map<
    string,
    {
      name: string;
      quantity: number;
      currentStock: number;
      unitCost: Prisma.Decimal;
      productNames: Set<string>;
    }
  >();
  const productReturns = new Map<
    string,
    {
      name: string;
      quantity: number;
      currentQuantity: number;
      unitCost: Prisma.Decimal;
    }
  >();

  for (const item of order.items) {
    const soldQuantity = toNumber(item.quantity);
    const { product } = item;

    if (!product.trackStock) {
      continue;
    }

    if (product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const quantity = Number((toNumber(recipeItem.quantity) * soldQuantity).toFixed(3));
        const current = ingredientReturns.get(recipeItem.ingredientId);

        if (current) {
          current.quantity = Number((current.quantity + quantity).toFixed(3));
          current.productNames.add(product.name);
        } else {
          ingredientReturns.set(recipeItem.ingredientId, {
            name: recipeItem.ingredient.name,
            quantity,
            currentStock: toNumber(recipeItem.ingredient.currentStock),
            unitCost: recipeItem.ingredient.cost,
            productNames: new Set([product.name])
          });
        }
      }

      continue;
    }

    const stockBalance = product.stockBalance;

    if (!stockBalance) {
      throw new Error(`Produto ${product.name} nao possui saldo de estoque configurado.`);
    }

    const currentQuantity = toNumber(stockBalance.quantity);
    const current = productReturns.get(product.id);

    if (current) {
      current.quantity = Number((current.quantity + soldQuantity).toFixed(3));
    } else {
      productReturns.set(product.id, {
        name: product.name,
        quantity: soldQuantity,
        currentQuantity,
        unitCost: product.cost
      });
    }
  }

  const recipeDetails: Array<{
    ingredientId: string;
    ingredientName: string;
    movementId: string;
    products: string[];
    previousStock: number;
    quantity: number;
    nextStock: number;
    unitCost: number;
    estimatedCostReturned: number;
  }> = [];
  const productDetails: Array<{
    productId: string;
    productName: string;
    previousStock: number;
    quantity: number;
    nextStock: number;
    unitCost: number;
    estimatedCostReturned: number;
  }> = [];

  for (const [ingredientId, item] of ingredientReturns.entries()) {
    const nextStock = Number((item.currentStock + item.quantity).toFixed(3));
    const unitCost = toNumber(item.unitCost);
    const estimatedCostReturned = roundMoney(item.quantity * unitCost);
    const movement = await tx.stockMovement.create({
      data: {
        ingredientId,
        type: "ADJUSTMENT",
        quantity: item.quantity,
        unitCost: item.unitCost,
        reason: `Retorno automatico do estorno da venda ${order.number} - ${Array.from(item.productNames).join(", ")}`,
        referenceType: "sales_order_refund",
        referenceId: order.id
      }
    });

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: nextStock
      }
    });

    recipeDetails.push({
      ingredientId,
      ingredientName: item.name,
      movementId: movement.id,
      products: Array.from(item.productNames),
      previousStock: item.currentStock,
      quantity: item.quantity,
      nextStock,
      unitCost,
      estimatedCostReturned
    });
  }

  for (const [productId, item] of productReturns.entries()) {
    const nextStock = Number((item.currentQuantity + item.quantity).toFixed(3));
    const unitCost = toNumber(item.unitCost);
    const estimatedCostReturned = roundMoney(item.quantity * unitCost);
    await tx.stockBalance.update({
      where: { productId },
      data: {
        quantity: nextStock
      }
    });

    productDetails.push({
      productId,
      productName: item.name,
      previousStock: item.currentQuantity,
      quantity: item.quantity,
      nextStock,
      unitCost,
      estimatedCostReturned
    });
  }

  const ingredientMovements = ingredientReturns.size;
  const productAdjustments = productReturns.size;
  const estimatedCmvReturned = roundMoney(
    recipeDetails.reduce((sum, item) => sum + item.estimatedCostReturned, 0) +
      productDetails.reduce((sum, item) => sum + item.estimatedCostReturned, 0)
  );

  await tx.salesOrder.update({
    where: { id: order.id },
    data: {
      stockDeductedAt: null
    }
  });

  await tx.auditLog.create({
    data: {
      userId,
      module: "stock",
      action: "sale_stock_return",
      entityType: "sales_order",
      entityId: order.id,
      metadata: {
        orderNumber: order.number,
        estimatedCmvReturned,
        ingredientMovements,
        productAdjustments,
        productDetails,
        recipeDetails,
        reason
      }
    }
  });

  return {
    alreadyReturned: false,
    estimatedCmvReturned,
    ingredientMovements,
    productAdjustments,
    productDetails,
    recipeDetails
  };
}

export async function listOperationDashboard() {
  const [orders, registers, openTabs] = await Promise.all([
    db.salesOrder.findMany({
      include: {
        customer: true,
        table: true,
        tab: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        openedAt: "desc"
      },
      take: 20
    }),
    db.cashRegister.count({
      where: { status: "OPEN" }
    }),
    db.tab.findMany({
      where: {
        active: true,
        orders: {
          some: {
            status: {
              in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
            }
          }
        }
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
            }
          },
          include: {
            payments: true
          },
          orderBy: {
            openedAt: "desc"
          }
        }
      },
      orderBy: {
        openedAt: "desc"
      },
      take: 8
    })
  ]);

  const openOrders = orders.filter((item) => item.status !== "PAID" && item.status !== "CANCELED");
  const kitchenItems = orders.filter((item) => item.status === "PREPARING" || item.status === "READY");
  const openTabsWithTotals = openTabs.map((tab) => {
    const total = tab.orders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const paid = tab.orders.reduce((sum, order) => sum + sumPaidPayments(order.payments), 0);

    return {
      id: tab.id,
      number: tab.number,
      customerName: tab.customerName ?? "",
      ordersCount: tab.orders.length,
      total: roundMoney(total),
      paid: roundMoney(paid),
      remaining: Math.max(0, roundMoney(total - paid))
    };
  });

  return {
    kpis: {
      openOrders: openOrders.length,
      kitchenOrders: kitchenItems.length,
      openRegisters: registers,
      openTabs: openTabs.length,
      openTabsWithOrders: openTabsWithTotals.filter((tab) => tab.ordersCount > 0).length,
      openTabsBalance: roundMoney(openTabsWithTotals.reduce((sum, tab) => sum + tab.remaining, 0))
    },
    tabs: openTabsWithTotals,
    orders: openOrders.map((order) => ({
      id: order.id,
      number: order.number,
      channel: order.channel,
      channelLabel: salesChannelLabels[order.channel],
      status: order.status,
      statusLabel: salesStatusLabels[order.status],
      customerLabel:
        order.customer?.name ??
        order.table?.name ??
        order.tab?.number ??
        "Atendimento direto",
      total: toNumber(order.total),
      itemsCount: order.items.length,
      notes: order.notes ?? ""
    }))
  };
}

export async function createSalesOrder(
  data: SalesOrderPayload,
  userId: string,
  userPermissions: string[] = []
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    assertSalesChannelEnabled(data.channel, settings);

    const resolvedTabId = data.channel === "TAB" ? await resolveTabIdForOrder(tx, data.tabId, data.tabCode) : "";
    const items = await buildOrderItems(tx, data.items, settings, userPermissions);

    if (settings.blockOutOfStockSales) {
      await assertOrderItemsStockAvailable(tx, data.items);
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await tx.salesOrder.create({
      data: {
        number: buildOrderNumber(),
        channel: data.channel,
        status: "OPEN",
        customerId: data.customerId || null,
        tableId: data.tableId || null,
        tabId: resolvedTabId || null,
        openedBy: userId,
        notes: data.notes || null,
        subtotal,
        total: subtotal,
        items: {
          create: items
        }
      }
    });
    const productionItemsCount = await createProductionItemsForOrder(tx, order.id);

    await audit(userId, "sales", "create_order", "sales_order", order.id, {
      channel: data.channel,
      tabCode: data.tabCode,
      itemsCount: items.length,
      productionItemsCount,
      subtotal
    });

    return order;
  });
}

export async function createOrAppendSalesOrder(
  data: SalesOrderPayload,
  userId: string,
  userPermissions: string[] = []
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    assertSalesChannelEnabled(data.channel, settings);

    const resolvedTabId = data.channel === "TAB" ? await resolveTabIdForOrder(tx, data.tabId, data.tabCode) : "";
    const targetData = { ...data, tabId: resolvedTabId };
    const items = await buildOrderItems(tx, data.items, settings, userPermissions);

    if (settings.blockOutOfStockSales) {
      await assertOrderItemsStockAvailable(tx, data.items);
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const openOrder = await findOpenOrderForChannel(tx, targetData);

    if (openOrder) {
      const updatedOrder = await tx.salesOrder.update({
        where: { id: openOrder.id },
        data: {
          customerId: data.customerId || openOrder.customerId,
          tableId: data.tableId || openOrder.tableId,
          tabId: resolvedTabId || openOrder.tabId,
          notes: data.notes || openOrder.notes,
          subtotal: { increment: subtotal },
          total: { increment: subtotal },
          items: {
            create: items
          }
        }
      });
      const productionItemsCount = await createProductionItemsForOrder(tx, updatedOrder.id);

      await tx.auditLog.create({
        data: {
          userId,
          module: "sales",
          action: "append_to_open_order",
          entityType: "sales_order",
          entityId: updatedOrder.id,
          metadata: {
            channel: data.channel,
            tabCode: data.tabCode,
            itemsCount: items.length,
            productionItemsCount,
            subtotal,
            source: "operations_form"
          }
        }
      });

      return {
        ...updatedOrder,
        appendedToExistingOrder: true
      };
    }

    const order = await tx.salesOrder.create({
      data: {
        number: buildOrderNumber(),
        channel: data.channel,
        status: "OPEN",
        customerId: data.customerId || null,
        tableId: data.tableId || null,
        tabId: resolvedTabId || null,
        openedBy: userId,
        notes: data.notes || null,
        subtotal,
        total: subtotal,
        items: {
          create: items
        }
      }
    });
    const productionItemsCount = await createProductionItemsForOrder(tx, order.id);

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "create_order",
        entityType: "sales_order",
        entityId: order.id,
        metadata: {
          channel: data.channel,
          tabCode: data.tabCode,
          itemsCount: items.length,
          productionItemsCount,
          subtotal,
          source: "operations_form"
        }
      }
    });

    return {
      ...order,
      appendedToExistingOrder: false
    };
  });
}

export async function captureScaleReading(
  data: {
    productId: string;
    scaleDeviceId?: string;
    weightKg?: number;
    sourceMode: "MANUAL" | "DEVICE";
    notes?: string;
  },
  userId: string,
  userPermissions: string[] = []
) {
  const reading = await db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);

    if (data.sourceMode === "MANUAL") {
      assertManualWeightAllowed(settings, userPermissions);
    }

    if (!settings.enableBuffetKg) {
      throw new Error("Venda por quilo esta desabilitada nas configuracoes.");
    }

    const created = await createScaleReadingRecord(tx, {
      ...data,
      userId
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "scale",
        action: "capture_reading",
        entityType: "scale_reading",
        entityId: created.id,
        metadata: {
          productId: created.productId,
          scaleDeviceId: created.scaleDeviceId,
          sourceMode: data.sourceMode,
          manualFallback: data.sourceMode === "MANUAL",
          grossWeightKg: toNumber(created.grossWeightKg),
          tareKg: toNumber(created.tareKg),
          netWeightKg: toNumber(created.netWeightKg),
          weightKg: toNumber(created.weightKg),
          totalPrice: toNumber(created.totalPrice),
          stabilitySummary: data.sourceMode === "DEVICE" ? created.notes : null
        }
      }
    });

    return created;
  });

  return {
    id: reading.id,
    grossWeightKg: toNumber(reading.grossWeightKg),
    tareKg: toNumber(reading.tareKg),
    netWeightKg: toNumber(reading.netWeightKg),
    weightKg: toNumber(reading.weightKg),
    pricePerKg: toNumber(reading.pricePerKg),
    totalPrice: toNumber(reading.totalPrice),
    source: reading.source,
    readAt: reading.readAt.toISOString(),
    deviceName: reading.scaleDevice?.name ?? "Leitura manual"
  };
}

export async function launchScaleSale(
  data: {
    productId: string;
    targetType: "COUNTER" | "TABLE" | "TAB";
    targetId?: string;
    targetCode?: string;
    scaleDeviceId?: string;
    weightKg?: number;
    sourceMode: "MANUAL" | "DEVICE";
    notes?: string;
  },
  userId: string,
  userPermissions: string[] = []
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    const targetChannel =
      data.targetType === "TABLE"
        ? "TABLE"
        : data.targetType === "TAB"
          ? "TAB"
          : "COUNTER";
    assertSalesChannelEnabled(targetChannel, settings);

    if (!settings.enableBuffetKg) {
      throw new Error("Venda por quilo esta desabilitada nas configuracoes.");
    }

    if (data.sourceMode === "MANUAL") {
      assertManualWeightAllowed(settings, userPermissions);
    }

    const reading = await createScaleReadingRecord(tx, {
      productId: data.productId,
      scaleDeviceId: data.scaleDeviceId,
      weightKg: data.weightKg,
      sourceMode: data.sourceMode,
      notes: data.notes,
      userId
    });

    const orderChannel = targetChannel;

    let resolvedTargetId = data.targetId;

    if (data.targetType === "TABLE" && !resolvedTargetId) {
      const lookup = normalizeTableLookup(data.targetCode);
      const table = lookup.length
        ? await tx.restaurantTable.findFirst({
            where: {
              active: true,
              OR: [
                { code: { in: lookup } },
                { name: { in: lookup } }
              ]
            }
          })
        : null;

      if (!table) {
        throw new Error("Mesa nao encontrada. Confira o numero digitado na balanca.");
      }

      resolvedTargetId = table.id;
    }

    if (data.targetType === "TAB" && !resolvedTargetId) {
      const tabCode = onlyDigits(data.targetCode);
      const lookup = normalizeTabLookup(tabCode);
      const tab = lookup.length
        ? await tx.tab.findFirst({
            where: {
              active: true,
              number: { in: lookup }
            }
          })
        : null;

      if (tab) {
        resolvedTargetId = tab.id;
      } else if (tabCode) {
        const createdTab = await tx.tab.create({
          data: {
            number: tabCode,
            customerName: `Comanda ${tabCode}`
          }
        });

        resolvedTargetId = createdTab.id;
      } else {
        throw new Error("Comanda nao encontrada. Confira o numero digitado na balanca.");
      }
    }

    const targetFilter =
      data.targetType === "TABLE"
        ? { tableId: resolvedTargetId ?? "" }
        : data.targetType === "TAB"
          ? { tabId: resolvedTargetId ?? "" }
          : { tableId: null, tabId: null, channel: "COUNTER" as SalesChannel };

    const openOrder = await tx.salesOrder.findFirst({
      where: {
        ...targetFilter,
        status: {
          in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
        }
      },
      orderBy: {
        openedAt: "desc"
      }
    });

    const item = (await buildOrderItems(
      tx,
      [
        {
          productId: data.productId,
          quantity: toNumber(reading.weightKg),
          weightKg: toNumber(reading.weightKg),
          scaleReadingId: reading.id,
          notes: data.notes
        }
      ],
      settings,
      userPermissions
    ))[0];

    if (settings.blockOutOfStockSales) {
      await assertOrderItemsStockAvailable(tx, [
        {
          productId: data.productId,
          quantity: toNumber(reading.weightKg),
          weightKg: toNumber(reading.weightKg),
          scaleReadingId: reading.id,
          notes: data.notes
        }
      ]);
    }

    const order = openOrder
      ? await tx.salesOrder.update({
          where: { id: openOrder.id },
          data: {
            notes: data.notes || openOrder.notes,
            subtotal: {
              increment: item.totalPrice
            },
            total: {
              increment: item.totalPrice
            },
            items: {
              create: item
            }
          }
        })
      : await tx.salesOrder.create({
          data: {
            number: buildOrderNumber(),
            channel: orderChannel,
            status: "OPEN",
            tableId: data.targetType === "TABLE" ? resolvedTargetId : null,
            tabId: data.targetType === "TAB" ? resolvedTargetId : null,
            openedBy: userId,
            notes: data.notes || null,
            subtotal: item.totalPrice,
            total: item.totalPrice,
            items: {
              create: item
            }
          }
        });
    const productionItemsCount = await createProductionItemsForOrder(tx, order.id);

    await tx.auditLog.createMany({
      data: [
        {
          userId,
          module: "scale",
          action: "capture_reading",
          entityType: "scale_reading",
          entityId: reading.id,
          metadata: {
            productId: reading.productId,
            scaleDeviceId: reading.scaleDeviceId,
            sourceMode: data.sourceMode,
            manualFallback: data.sourceMode === "MANUAL",
            grossWeightKg: toNumber(reading.grossWeightKg),
            tareKg: toNumber(reading.tareKg),
            netWeightKg: toNumber(reading.netWeightKg),
            weightKg: toNumber(reading.weightKg),
            totalPrice: toNumber(reading.totalPrice),
            stabilitySummary: data.sourceMode === "DEVICE" ? reading.notes : null
          }
        },
        {
          userId,
          module: "scale",
          action: openOrder ? "append_to_open_order" : "launch_to_new_order",
          entityType: "sales_order",
          entityId: order.id,
          metadata: {
            targetType: data.targetType,
            targetId: resolvedTargetId ?? null,
            targetCode: data.targetCode ?? null,
            scaleReadingId: reading.id,
            productId: data.productId,
            totalPrice: toNumber(reading.totalPrice),
            productionItemsCount
          }
        }
      ]
    });

    return {
      orderId: order.id,
      orderNumber: order.number,
      appendedToExistingOrder: Boolean(openOrder),
      reading: {
        id: reading.id,
        grossWeightKg: toNumber(reading.grossWeightKg),
        tareKg: toNumber(reading.tareKg),
        netWeightKg: toNumber(reading.netWeightKg),
        weightKg: toNumber(reading.weightKg),
        pricePerKg: toNumber(reading.pricePerKg),
        totalPrice: toNumber(reading.totalPrice),
        source: reading.source,
        readAt: reading.readAt.toISOString(),
        deviceName: reading.scaleDevice?.name ?? "Leitura manual"
      }
    };
  });
}

export async function listKitchenOrders() {
  const now = new Date();
  const orders = await db.salesOrder.findMany({
    where: {
      status: {
        in: ["OPEN", "PREPARING", "READY"]
      }
    },
    include: {
      customer: true,
      table: true,
      tab: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      openedAt: "asc"
    }
  });

  return orders.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: salesStatusLabels[order.status],
    channel: order.channel,
    channelLabel: salesChannelLabels[order.channel],
    openedAt: order.openedAt.toISOString(),
    minutesOpen: Math.max(0, Math.floor((now.getTime() - order.openedAt.getTime()) / 60000)),
    label:
      order.table?.name ??
      order.tab?.number ??
      order.customer?.name ??
      "Atendimento direto",
    notes: order.notes ?? "",
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: toNumber(item.quantity),
      weightKg: toNumber(item.weightKg),
      notes: item.notes ?? ""
    }))
  }));
}

export async function listProductionBoard(sectorId?: string) {
  const sectors = await db.productionSector.findMany({
    where: {
      active: true,
      ...(sectorId ? { id: sectorId } : {})
    },
    include: {
      items: {
        where: {
          status: {
            in: ["PENDING", "PREPARING", "READY"]
          },
          salesOrderItem: {
            salesOrder: {
              status: {
                in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
              }
            }
          }
        },
        include: {
          salesOrderItem: {
            include: {
              product: true,
              salesOrder: {
                include: {
                  customer: true,
                  table: true,
                  tab: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return sectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    slug: sector.slug,
    pendingCount: sector.items.filter((item) => item.status === "PENDING").length,
    preparingCount: sector.items.filter((item) => item.status === "PREPARING").length,
    readyCount: sector.items.filter((item) => item.status === "READY").length,
    items: sector.items.map((item) => {
      const order = item.salesOrderItem.salesOrder;

      return {
        id: item.id,
        status: item.status,
        statusLabel: productionStatusLabels[item.status],
        quantity: toNumber(item.quantity) ?? 0,
        priority: item.priority,
        priorityLabel: item.priority >= 3 ? "Alta" : item.priority <= 1 ? "Baixa" : "Normal",
        estimatedMinutes: item.estimatedMinutes,
        dueAt: item.dueAt?.toISOString() ?? null,
        isLate: Boolean(item.dueAt && item.status !== "READY" && item.dueAt.getTime() < Date.now()),
        notes: item.notes ?? "",
        createdAt: item.createdAt.toISOString(),
        startedAt: item.startedAt?.toISOString() ?? null,
        readyAt: item.readyAt?.toISOString() ?? null,
        productName: item.salesOrderItem.product.name,
        itemNotes: item.salesOrderItem.notes ?? "",
        orderId: order.id,
        orderNumber: order.number,
        ticketCode: order.number.slice(-4).padStart(4, "0"),
        channel: order.channel,
        channelLabel: salesChannelLabels[order.channel],
        destination:
          order.table?.name ??
          (order.tab ? `Comanda ${order.tab.number}` : null) ??
          order.customer?.name ??
          "Balcao"
      };
    })
  }));
}

export async function updateProductionItemStatus(
  data: { productionItemId: string; status: ProductionItemStatus; reason?: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const current = await tx.productionItem.findUniqueOrThrow({
      where: { id: data.productionItemId },
      include: {
        productionSector: true,
        salesOrderItem: {
          include: {
            product: true,
            salesOrder: true
          }
        }
      }
    });

    const now = new Date();
    const reason = data.reason?.trim() ?? "";
    const updated = await tx.productionItem.update({
      where: { id: current.id },
      data: {
        status: data.status,
        startedAt: data.status === "PREPARING" && !current.startedAt ? now : current.startedAt,
        readyAt: data.status === "READY" && !current.readyAt ? now : current.readyAt,
        deliveredAt: data.status === "DELIVERED" && !current.deliveredAt ? now : current.deliveredAt,
        canceledAt: data.status === "CANCELED" && !current.canceledAt ? now : current.canceledAt,
        notes:
          data.status === "CANCELED" && reason
            ? `${current.notes ? `${current.notes}\n` : ""}Cancelamento da producao: ${reason}`
            : current.notes
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "production",
        action: "update_production_item_status",
        entityType: "production_item",
        entityId: updated.id,
        metadata: {
          previousStatus: current.status,
          status: updated.status,
          priority: current.priority,
          estimatedMinutes: current.estimatedMinutes,
          dueAt: current.dueAt?.toISOString() ?? null,
          reason: reason || null,
          sectorId: current.productionSectorId,
          sectorName: current.productionSector.name,
          salesOrderId: current.salesOrderItem.salesOrderId,
          orderNumber: current.salesOrderItem.salesOrder.number,
          productId: current.salesOrderItem.productId,
          productName: current.salesOrderItem.product.name
        }
      }
    });

    return updated;
  });
}

export async function updateOrderStatus(
  data: { salesOrderId: string; status: SalesOrderStatus; cancelReason?: string },
  userId: string
) {
  const order = await db.$transaction(async (tx) => {
    const current = await tx.salesOrder.findUniqueOrThrow({
      where: { id: data.salesOrderId },
      include: { payments: true }
    });

    if (current.status === "PAID" && data.status === "CANCELED") {
      throw new Error("Pedidos pagos nao podem ser cancelados sem estorno.");
    }

    const paidAmount = current.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (data.status === "CANCELED" && paidAmount > 0) {
      throw new Error("Nao e permitido cancelar pedidos com pagamentos registrados.");
    }

    const updated = await tx.salesOrder.update({
      where: { id: data.salesOrderId },
      data: {
        status: data.status,
        notes:
          data.status === "CANCELED" && data.cancelReason
            ? `${current.notes ? `${current.notes}\n` : ""}Cancelamento: ${data.cancelReason.trim()}`
            : current.notes,
        closedAt:
          data.status === "DELIVERED" || data.status === "PAID" || data.status === "CANCELED"
            ? new Date()
            : null
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: data.status === "CANCELED" ? "cancel_order" : "update_status",
        entityType: "sales_order",
        entityId: updated.id,
        metadata: {
          previousStatus: current.status,
          status: data.status,
          cancelReason: data.cancelReason?.trim() || null
        }
      }
    });

    const settings = await getRuntimeOperationSettings(tx);

    if (data.status === "PAID" && settings.enableAutoStockDeduction) {
      await deductStockForPaidOrder(tx, updated.id, userId);
    }

    return updated;
  });

  return order;
}

export async function cancelSalesOrderItem(
  data: { salesOrderItemId: string; cancelReason: string },
  userId: string,
  canApproveImmediately = true
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    const item = await tx.salesOrderItem.findUniqueOrThrow({
      where: { id: data.salesOrderItemId },
      include: {
        product: true,
        salesOrder: {
          include: {
            items: true,
            payments: true
          }
        }
      }
    });

    const order = item.salesOrder;
    const reason = data.cancelReason.trim();

    if (order.status === "PAID" || order.status === "CANCELED") {
      throw new Error("Nao e permitido cancelar item de pedido pago ou cancelado.");
    }

    if (order.stockDeductedAt) {
      throw new Error("Nao e permitido cancelar item depois da baixa de estoque.");
    }

    const paidAmount = order.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paidAmount > 0) {
      throw new Error("Nao e permitido cancelar item de pedido com pagamento registrado.");
    }

    if (order.items.length <= 1) {
      throw new Error("Pedido com apenas um item deve ser cancelado por completo.");
    }

    if (settings.requireCancelApproval && !canApproveImmediately) {
      const existing = await tx.cancellationRequest.findFirst({
        where: {
          target: "SALES_ORDER_ITEM",
          salesOrderItemId: item.id,
          status: "PENDING"
        }
      });

      if (existing) {
        return {
          approvalRequired: true,
          request: existing
        };
      }

      const request = await tx.cancellationRequest.create({
        data: {
          target: "SALES_ORDER_ITEM",
          salesOrderId: order.id,
          salesOrderItemId: item.id,
          reason,
          requestedBy: userId
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          module: "sales",
          action: "request_cancel_order_item",
          entityType: "cancellation_request",
          entityId: request.id,
          metadata: {
            salesOrderId: order.id,
            orderNumber: order.number,
            productId: item.productId,
            productName: item.product.name,
            salesOrderItemId: item.id,
            cancelReason: reason
          }
        }
      });

      return {
        approvalRequired: true,
        request
      };
    }

    await tx.salesOrderItem.delete({
      where: { id: item.id }
    });

    const subtotal = roundMoney(toNumber(order.subtotal) - toNumber(item.totalPrice));
    const total = Math.max(0, roundMoney(subtotal - toNumber(order.discount) + toNumber(order.serviceCharge)));

    const updatedOrder = await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        notes: `${order.notes ? `${order.notes}\n` : ""}Item cancelado: ${item.product.name} - ${reason}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "cancel_order_item",
        entityType: "sales_order_item",
        entityId: item.id,
        metadata: {
          salesOrderId: order.id,
          orderNumber: order.number,
          productId: item.productId,
          productName: item.product.name,
          quantity: toNumber(item.quantity),
          totalPrice: toNumber(item.totalPrice),
          cancelReason: reason,
          newSubtotal: subtotal,
          newTotal: total
        }
      }
    });

    return updatedOrder;
  });
}

export async function listPendingCancellationRequests() {
  const requests = await db.cancellationRequest.findMany({
    where: {
      status: "PENDING"
    },
    orderBy: {
      createdAt: "asc"
    },
    take: 20
  });

  const userIds = Array.from(new Set(requests.map((request) => request.requestedBy)));
  const itemIds = requests
    .map((request) => request.salesOrderItemId)
    .filter((value): value is string => Boolean(value));
  const users = userIds.length
    ? await db.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true,
          name: true,
          role: {
            select: {
              name: true
            }
          }
        }
      })
    : [];
  const items = itemIds.length
    ? await db.salesOrderItem.findMany({
        where: {
          id: { in: itemIds }
        },
        include: {
          product: true,
          salesOrder: {
            include: {
              tab: true,
              table: true
            }
          }
        }
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return requests.map((request) => {
    const user = usersById.get(request.requestedBy);
    const item = request.salesOrderItemId ? itemsById.get(request.salesOrderItemId) : null;
    const order = item?.salesOrder;

    return {
      id: request.id,
      target: request.target,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      requestedBy: user ? `${user.name} (${user.role.name})` : "Usuario removido",
      productName: item?.product.name ?? "Item removido",
      quantity: item ? toNumber(item.quantity) : 0,
      totalPrice: item ? toNumber(item.totalPrice) : 0,
      orderNumber: order?.number ?? "",
      tabLabel: order?.tab?.number ?? order?.table?.name ?? "Atendimento direto"
    };
  });
}

export async function reviewCancellationRequest(
  data: { requestId: string; approved: boolean; reviewNote?: string },
  userId: string
) {
  const request = await db.cancellationRequest.findUniqueOrThrow({
    where: {
      id: data.requestId
    }
  });

  if (request.status !== "PENDING") {
    throw new Error("Esta solicitacao ja foi revisada.");
  }

  if (data.approved) {
    if (request.target !== "SALES_ORDER_ITEM" || !request.salesOrderItemId) {
      throw new Error("Tipo de solicitacao ainda nao suportado para aprovacao automatica.");
    }

    await cancelSalesOrderItem(
      {
        salesOrderItemId: request.salesOrderItemId,
        cancelReason: `${request.reason}${data.reviewNote ? ` | Aprovacao: ${data.reviewNote.trim()}` : ""}`
      },
      userId,
      true
    );
  }

  const updated = await db.cancellationRequest.update({
    where: {
      id: request.id
    },
    data: {
      status: data.approved ? "APPROVED" : "REJECTED",
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNote: data.reviewNote?.trim() || null
    }
  });

  await db.auditLog.create({
    data: {
      userId,
      module: "sales",
      action: data.approved ? "approve_cancellation_request" : "reject_cancellation_request",
      entityType: "cancellation_request",
      entityId: request.id,
      metadata: {
        target: request.target,
        salesOrderId: request.salesOrderId,
        salesOrderItemId: request.salesOrderItemId,
        reason: request.reason,
        reviewNote: data.reviewNote?.trim() || null
      }
    }
  });

  return updated;
}

export async function adjustWeighableSalesOrderItem(
  data: { salesOrderItemId: string; weightKg: number; reason: string },
  userId: string,
  userPermissions: string[] = []
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    const item = await tx.salesOrderItem.findUniqueOrThrow({
      where: { id: data.salesOrderItemId },
      include: {
        product: true,
        salesOrder: {
          include: {
            items: true,
            payments: true
          }
        }
      }
    });

    const order = item.salesOrder;

    if (item.product.type !== "WEIGHABLE") {
      throw new Error("Ajuste de peso so e permitido para item vendido por quilo.");
    }

    assertManualWeightAllowed(settings, userPermissions);

    if (order.status === "PAID" || order.status === "CANCELED") {
      throw new Error("Nao e permitido ajustar item de pedido pago ou cancelado.");
    }

    if (order.stockDeductedAt) {
      throw new Error("Nao e permitido ajustar item depois da baixa de estoque.");
    }

    const paidAmount = order.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paidAmount > 0) {
      throw new Error("Nao e permitido ajustar item de pedido com pagamento registrado.");
    }

    const previousWeight = toNumber(item.weightKg ?? item.quantity);
    const previousTotal = toNumber(item.totalPrice);
    const unitPrice = toNumber(item.unitPrice);
    const weightKg = Number(data.weightKg.toFixed(3));
    const totalPrice = roundMoney(weightKg * unitPrice);
    const subtotal = roundMoney(toNumber(order.subtotal) - previousTotal + totalPrice);
    const total = Math.max(0, roundMoney(subtotal - toNumber(order.discount) + toNumber(order.serviceCharge)));
    const reason = data.reason.trim();

    await tx.salesOrderItem.update({
      where: { id: item.id },
      data: {
        quantity: weightKg,
        weightKg,
        totalPrice,
        notes: `${item.notes ? `${item.notes}\n` : ""}Peso ajustado manualmente: ${reason}`
      }
    });

    const updatedOrder = await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        notes: `${order.notes ? `${order.notes}\n` : ""}Ajuste de peso em ${item.product.name}: ${reason}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "adjust_weighable_item",
        entityType: "sales_order_item",
        entityId: item.id,
        metadata: {
          salesOrderId: order.id,
          orderNumber: order.number,
          productId: item.productId,
          productName: item.product.name,
          previousWeight,
          newWeight: weightKg,
          unitPrice,
          previousTotal,
          newTotal: totalPrice,
          newOrderSubtotal: subtotal,
          newOrderTotal: total,
          reason
        }
      }
    });

    return updatedOrder;
  });
}

export async function updateSalesOrderItem(
  data: { salesOrderItemId: string; quantity?: number; discount?: number; notes?: string; reason: string },
  userId: string,
  options: { canOverrideDiscountLimit?: boolean } = {}
) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true }
    });
    const item = await tx.salesOrderItem.findUniqueOrThrow({
      where: { id: data.salesOrderItemId },
      include: {
        product: true,
        productionItem: true,
        salesOrder: {
          include: {
            payments: true
          }
        }
      }
    });
    const order = item.salesOrder;

    if (order.status === "PAID" || order.status === "CANCELED") {
      throw new Error("Nao e permitido editar item de pedido pago ou cancelado.");
    }

    if (order.stockDeductedAt) {
      throw new Error("Nao e permitido editar item depois da baixa de estoque.");
    }

    const paidAmount = order.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paidAmount > 0) {
      throw new Error("Nao e permitido editar item de pedido com pagamento registrado.");
    }

    const previousQuantity = toNumber(item.quantity);
    const previousDiscount = toNumber(item.discount);
    const previousNotes = item.notes ?? "";
    const previousTotal = toNumber(item.totalPrice);
    const unitPrice = toNumber(item.unitPrice);
    const reason = data.reason.trim();
    const notes = data.notes?.trim() || null;
    const isWeighable = item.product.type === "WEIGHABLE";
    const quantity = isWeighable ? previousQuantity : Number((data.quantity ?? previousQuantity).toFixed(3));

    if (isWeighable && data.quantity && Number(data.quantity.toFixed(3)) !== Number(previousQuantity.toFixed(3))) {
      throw new Error("Para produto por quilo, altere o peso pelo ajuste de peso.");
    }

    const grossTotal = isWeighable ? roundMoney(previousQuantity * unitPrice) : roundMoney(quantity * unitPrice);
    const discount = roundMoney(data.discount ?? previousDiscount);

    if (discount > grossTotal) {
      throw new Error("O desconto do item nao pode ser maior que o valor bruto do item.");
    }

    const discountPercent = grossTotal > 0 ? roundMoney((discount / grossTotal) * 100) : 0;
    const discountLimitPercent =
      user.role.itemDiscountLimitPercent === null ? null : toNumber(user.role.itemDiscountLimitPercent);

    if (
      data.discount !== undefined &&
      discountLimitPercent !== null &&
      discountPercent > discountLimitPercent &&
      !options.canOverrideDiscountLimit
    ) {
      throw new Error(`O desconto excede o limite de ${discountLimitPercent.toLocaleString("pt-BR")}%.`);
    }

    const totalPrice = Math.max(0, roundMoney(grossTotal - discount));
    const subtotal = roundMoney(toNumber(order.subtotal) - previousTotal + totalPrice);
    const total = Math.max(0, roundMoney(subtotal - toNumber(order.discount) + toNumber(order.serviceCharge)));

    const updatedItem = await tx.salesOrderItem.update({
      where: { id: item.id },
      data: {
        quantity,
        discount,
        totalPrice,
        notes
      }
    });

    if (item.productionItem) {
      await tx.productionItem.update({
        where: { id: item.productionItem.id },
        data: {
          quantity,
          notes
        }
      });
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        notes: `${order.notes ? `${order.notes}\n` : ""}Item editado: ${item.product.name} - ${reason}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "update_order_item",
        entityType: "sales_order_item",
        entityId: item.id,
        metadata: {
          salesOrderId: order.id,
          orderNumber: order.number,
          productId: item.productId,
          productName: item.product.name,
          previousQuantity,
          newQuantity: quantity,
          previousDiscount,
          newDiscount: discount,
          discountPercent,
          discountLimitPercent,
          discountLimitOverridden: Boolean(
            discountLimitPercent !== null && options.canOverrideDiscountLimit && discountPercent > discountLimitPercent
          ),
          previousNotes,
          newNotes: notes,
          unitPrice,
          grossTotal,
          previousTotal,
          newTotal: totalPrice,
          newOrderSubtotal: subtotal,
          newOrderTotal: total,
          reason
        }
      }
    });

    return {
      item: updatedItem,
      order: updatedOrder
    };
  });
}

export async function transferSalesOrderItem(
  data: { salesOrderItemId: string; targetTabCode: string; reason: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const item = await tx.salesOrderItem.findUniqueOrThrow({
      where: { id: data.salesOrderItemId },
      include: {
        product: true,
        salesOrder: {
          include: {
            items: true,
            payments: true,
            tab: true
          }
        }
      }
    });
    const sourceOrder = item.salesOrder;

    if (sourceOrder.status === "PAID" || sourceOrder.status === "CANCELED") {
      throw new Error("Nao e permitido transferir item de pedido pago ou cancelado.");
    }

    if (sourceOrder.stockDeductedAt) {
      throw new Error("Nao e permitido transferir item depois da baixa de estoque.");
    }

    const paidAmount = sourceOrder.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paidAmount > 0) {
      throw new Error("Nao e permitido transferir item de pedido com pagamento registrado.");
    }

    const targetTabId = await resolveTabIdForOrder(tx, "", data.targetTabCode);

    if (!targetTabId) {
      throw new Error("Informe uma comanda de destino valida.");
    }

    if (sourceOrder.tabId === targetTabId) {
      throw new Error("A comanda de destino deve ser diferente da comanda de origem.");
    }

    const itemTotal = toNumber(item.totalPrice);
    const sourceSubtotal = roundMoney(toNumber(sourceOrder.subtotal) - itemTotal);
    const sourceTotal = Math.max(0, roundMoney(sourceSubtotal - toNumber(sourceOrder.discount) + toNumber(sourceOrder.serviceCharge)));
    const targetOpenOrder = await findOpenOrderForChannel(tx, {
      channel: "TAB",
      tabId: targetTabId
    });
    const targetOrder =
      targetOpenOrder ??
      await tx.salesOrder.create({
        data: {
          number: buildOrderNumber(),
          channel: "TAB",
          status: "OPEN",
          tabId: targetTabId,
          openedBy: userId,
          notes: `Pedido criado por transferencia de item da comanda ${sourceOrder.tab?.number ?? "origem"}.`,
          subtotal: 0,
          total: 0
        }
      });

    await tx.salesOrderItem.update({
      where: { id: item.id },
      data: {
        salesOrderId: targetOrder.id,
        notes: item.notes
          ? `${item.notes}\nTransferido: ${data.reason.trim()}`
          : `Transferido: ${data.reason.trim()}`
      }
    });

    const sourceOrderItemsRemaining = sourceOrder.items.length - 1;
    const updatedSourceOrder = await tx.salesOrder.update({
      where: { id: sourceOrder.id },
      data: {
        subtotal: Math.max(0, sourceSubtotal),
        total: sourceOrderItemsRemaining > 0 ? sourceTotal : 0,
        status: sourceOrderItemsRemaining > 0 ? sourceOrder.status : "CANCELED",
        closedAt: sourceOrderItemsRemaining > 0 ? sourceOrder.closedAt : new Date(),
        notes: `${sourceOrder.notes ? `${sourceOrder.notes}\n` : ""}Item transferido: ${item.product.name} - ${data.reason.trim()}`
      }
    });
    const targetSubtotal = roundMoney(toNumber(targetOrder.subtotal) + itemTotal);
    const targetTotal = Math.max(0, roundMoney(targetSubtotal - toNumber(targetOrder.discount) + toNumber(targetOrder.serviceCharge)));
    const updatedTargetOrder = await tx.salesOrder.update({
      where: { id: targetOrder.id },
      data: {
        subtotal: targetSubtotal,
        total: targetTotal,
        notes: `${targetOrder.notes ? `${targetOrder.notes}\n` : ""}Item recebido por transferencia: ${item.product.name} - ${data.reason.trim()}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "transfer_order_item",
        entityType: "sales_order_item",
        entityId: item.id,
        metadata: {
          productId: item.productId,
          productName: item.product.name,
          sourceOrderId: sourceOrder.id,
          sourceOrderNumber: sourceOrder.number,
          sourceTabCode: sourceOrder.tab?.number ?? null,
          targetOrderId: targetOrder.id,
          targetOrderNumber: targetOrder.number,
          targetTabCode: onlyDigits(data.targetTabCode),
          itemTotal,
          sourceOrderCanceled: sourceOrderItemsRemaining === 0,
          reason: data.reason.trim()
        }
      }
    });

    return {
      itemId: item.id,
      sourceOrder: updatedSourceOrder,
      targetOrder: updatedTargetOrder
    };
  });
}

export async function mergeOperationalTabs(
  data: { sourceTabCode: string; targetTabCode: string; reason: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const sourceCode = onlyDigits(data.sourceTabCode);
    const targetCode = onlyDigits(data.targetTabCode);

    if (!sourceCode || !targetCode) {
      throw new Error("Informe as comandas de origem e destino.");
    }

    if (sourceCode === targetCode) {
      throw new Error("A comanda de destino deve ser diferente da origem.");
    }

    const sourceTab = await tx.tab.findFirst({
      where: {
        active: true,
        number: {
          in: normalizeTabLookup(sourceCode)
        }
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
            }
          },
          include: {
            payments: true
          }
        }
      }
    });

    if (!sourceTab) {
      throw new Error("Comanda de origem nao encontrada ou sem pedido aberto.");
    }

    const blockedOrder = sourceTab.orders.find((order) => {
      const paidAmount = order.payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

      return Boolean(order.stockDeductedAt) || paidAmount > 0;
    });

    if (blockedOrder) {
      throw new Error("Nao e permitido unir comanda com pedido pago, com pagamento registrado ou baixa de estoque.");
    }

    const targetTabId = await resolveTabIdForOrder(tx, "", targetCode);
    const targetTab = await tx.tab.findUniqueOrThrow({
      where: { id: targetTabId }
    });

    if (targetTab.id === sourceTab.id) {
      throw new Error("A comanda de destino deve ser diferente da origem.");
    }

    const orderIds = sourceTab.orders.map((order) => order.id);

    if (orderIds.length === 0) {
      throw new Error("Comanda de origem nao possui pedidos em aberto para unir.");
    }

    await Promise.all(
      sourceTab.orders.map((order) =>
        tx.salesOrder.update({
          where: { id: order.id },
          data: {
            tabId: targetTab.id,
            notes: `${order.notes ? `${order.notes}\n` : ""}Comanda unida da origem ${sourceTab.number} para ${targetTab.number}: ${data.reason.trim()}`
          }
        })
      )
    );

    await tx.tab.update({
      where: { id: sourceTab.id },
      data: {
        active: false,
        closedAt: new Date(),
        customerName: `${sourceTab.customerName ?? `Comanda ${sourceTab.number}`} - unida na comanda ${targetTab.number}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "merge_tabs",
        entityType: "tab",
        entityId: sourceTab.id,
        metadata: {
          sourceTabId: sourceTab.id,
          sourceTabCode: sourceTab.number,
          targetTabId: targetTab.id,
          targetTabCode: targetTab.number,
          ordersMoved: orderIds.length,
          orderIds,
          reason: data.reason.trim()
        }
      }
    });

    return {
      sourceTabCode: sourceTab.number,
      targetTabCode: targetTab.number,
      ordersMoved: orderIds.length
    };
  });
}

export async function updateSalesOrderAdjustments(
  data: { salesOrderId: string; discount: number; serviceCharge: number; reason: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: data.salesOrderId },
      include: {
        payments: true
      }
    });

    if (order.status === "PAID" || order.status === "CANCELED") {
      throw new Error("Nao e permitido ajustar pedido pago ou cancelado.");
    }

    const paidAmount = order.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paidAmount > 0) {
      throw new Error("Nao e permitido ajustar pedido com pagamento registrado.");
    }

    const subtotal = toNumber(order.subtotal);
    const discount = roundMoney(data.discount);
    const serviceCharge = roundMoney(data.serviceCharge);
    const total = roundMoney(subtotal - discount + serviceCharge);

    if (total < 0) {
      throw new Error("O desconto nao pode deixar o total do pedido negativo.");
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        discount,
        serviceCharge,
        total,
        notes: `${order.notes ? `${order.notes}\n` : ""}Ajuste de valor: ${data.reason.trim()}`
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "update_order_adjustments",
        entityType: "sales_order",
        entityId: order.id,
        metadata: {
          orderNumber: order.number,
          previousDiscount: toNumber(order.discount),
          previousServiceCharge: toNumber(order.serviceCharge),
          previousTotal: toNumber(order.total),
          discount,
          serviceCharge,
          total,
          reason: data.reason.trim()
        }
      }
    });

    return updatedOrder;
  });
}

export type CashOrderStatusFilter = "all" | "paid" | "pending";

export type CashOrderFilters = {
  channel?: SalesChannel | "all";
  search?: string;
  status?: CashOrderStatusFilter;
  tabQuery?: string;
};

export async function listCashOrders(filters: CashOrderFilters = {}) {
  const tabLookup = normalizeTabLookup(filters.tabQuery);
  const search = filters.search?.trim() ?? "";
  const status = filters.status ?? "pending";
  const channel = filters.channel ?? "all";
  const recentPaidSince = new Date(Date.now() - 1000 * 60 * 60 * 8);
  const statusWhere: Prisma.SalesOrderWhereInput =
    status === "paid"
      ? {
          status: "PAID",
          closedAt: {
            gte: recentPaidSince
          }
        }
      : status === "all"
        ? {
            OR: [
              {
                status: {
                  in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
                }
              },
              {
                status: "PAID",
                closedAt: {
                  gte: recentPaidSince
                }
              }
            ]
          }
        : {
            status: {
              in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
            }
          };
  const tabWhere: Prisma.SalesOrderWhereInput | null = tabLookup.length
    ? {
        tab: {
          number: {
            in: tabLookup
          }
        }
      }
    : null;
  const channelWhere: Prisma.SalesOrderWhereInput | null =
    channel === "all"
      ? null
      : {
          channel
        };
  const searchWhere: Prisma.SalesOrderWhereInput | null = search
    ? {
        OR: [
          {
            number: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            tab: {
              number: {
                contains: search,
                mode: "insensitive"
              }
            }
          },
          {
            table: {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          },
          {
            customer: {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        ]
      }
    : null;
  const whereParts = [statusWhere, tabWhere, channelWhere, searchWhere].filter(
    (where): where is Prisma.SalesOrderWhereInput => Boolean(where)
  );
  const orders = await db.salesOrder.findMany({
    where: whereParts.length ? { AND: whereParts } : undefined,
    include: {
      customer: true,
      table: true,
      tab: true,
      payments: true,
      items: {
        include: {
          product: true
        },
        orderBy: {
          product: {
            name: "asc"
          }
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: tabLookup.length || search ? undefined : 40
  });

  return orders.map((order) => {
    const paid = sumPaidPayments(order.payments);

    return {
      id: order.id,
      number: order.number,
      channel: order.channel,
      channelLabel: salesChannelLabels[order.channel],
      status: order.status,
      statusLabel: salesStatusLabels[order.status],
      label:
        order.table?.name ??
        order.tab?.number ??
        order.customer?.name ??
        "Atendimento direto",
      total: toNumber(order.total),
      subtotal: toNumber(order.subtotal),
      discount: toNumber(order.discount),
      serviceCharge: toNumber(order.serviceCharge),
      paid,
      remaining: Math.max(0, toNumber(order.total) - paid),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discount: toNumber(item.discount),
        totalPrice: toNumber(item.totalPrice),
        weightKg: toNumber(item.weightKg),
        notes: item.notes ?? "",
        isWeighable: item.product.type === "WEIGHABLE"
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        methodLabel: paymentMethodLabels[payment.method],
        amount: toNumber(payment.amount),
        status: payment.status,
        statusLabel: paymentStatusLabels[payment.status],
        paidAt: payment.paidAt?.toISOString() ?? null
      }))
    };
  });
}

export async function listOperationalTabs(query?: string) {
  const lookup = normalizeTabLookup(query);
  const tabs = await db.tab.findMany({
    where: {
      active: true,
      ...(lookup.length
        ? {
            number: {
              in: lookup
            }
          }
        : {
            orders: {
              some: {
                status: {
                  in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
                }
              }
            }
          })
    },
    include: {
      orders: {
        where: {
          status: {
            in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
          }
        },
        include: {
          payments: true,
          items: {
            include: {
              product: true,
              scaleReading: {
                include: {
                  scaleDevice: true
                }
              }
            }
          }
        },
        orderBy: {
          openedAt: "desc"
        }
      }
    },
    orderBy: {
      openedAt: "desc"
    },
    take: query ? 1 : 20
  });
  const orderIds = tabs.flatMap((tab) => tab.orders.map((order) => order.id));
  const itemIds = tabs.flatMap((tab) => tab.orders.flatMap((order) => order.items.map((item) => item.id)));
  const paymentIds = tabs.flatMap((tab) => tab.orders.flatMap((order) => order.payments.map((payment) => payment.id)));
  const scaleReadingIds = tabs.flatMap((tab) =>
    tab.orders.flatMap((order) => order.items.map((item) => item.scaleReadingId).filter((id): id is string => Boolean(id)))
  );
  const auditLogs = orderIds.length
    ? await db.auditLog.findMany({
        where: {
          OR: [
            { entityId: { in: orderIds } },
            { entityId: { in: itemIds.length ? itemIds : [""] } },
            { entityId: { in: paymentIds.length ? paymentIds : [""] } },
            { entityId: { in: scaleReadingIds.length ? scaleReadingIds : [""] } }
          ]
        },
        include: {
          user: true
        },
        orderBy: {
          createdAt: "asc"
        }
      })
    : [];

  const userIds = Array.from(
    new Set([
      ...tabs.flatMap((tab) => tab.orders.map((order) => order.openedBy).filter((id): id is string => Boolean(id))),
      ...auditLogs.map((log) => log.userId).filter((id): id is string => Boolean(id))
    ])
  );
  const usersById = new Map(
    (
      await db.user.findMany({
        where: {
          id: {
            in: userIds.length ? userIds : [""]
          }
        },
        include: {
          role: true
        }
      })
    ).map((user) => [user.id, user])
  );

  function metadata(value: Prisma.JsonValue | null) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, Prisma.JsonValue>)
      : {};
  }

  function text(value: Prisma.JsonValue | undefined) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  }

  const auditLabelByAction: Record<string, string> = {
    append_to_open_order: "Itens adicionados",
    cancel_order: "Pedido cancelado",
    cancel_order_item: "Item cancelado",
    capture_reading: "Peso capturado",
    edit_order_item: "Item editado",
    launch_to_new_order: "Peso lancado",
    merge_tabs: "Comandas unidas",
    register_payment: "Pagamento registrado",
    sale_stock_deduction: "Baixa de estoque",
    split_payment: "Pagamento dividido",
    transfer_order_item: "Item transferido",
    update_order_adjustment: "Pedido ajustado",
    update_status: "Status alterado",
    weight_adjustment: "Peso ajustado"
  };

  function auditDescription(action: string, value: Prisma.JsonValue | null) {
    const data = metadata(value);

    if (action === "capture_reading" || action === "launch_to_new_order") {
      const weight = text(data.weightKg);
      const total = Number(data.totalPrice ?? 0);
      return `${weight ? `${Number(weight).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg` : "Peso registrado"}${total ? ` - ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}`;
    }

    if (action === "register_payment" || action === "split_payment") {
      const amount = Number(data.amount ?? data.batchTotal ?? 0);
      return `${text(data.method) || "Pagamento"}${amount ? ` - ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}`;
    }

    if (action.includes("cancel")) {
      return text(data.cancelReason) || text(data.reason) || "Cancelamento auditado.";
    }

    if (action.includes("transfer") || action.includes("merge") || action.includes("adjust") || action.includes("edit")) {
      return text(data.reason) || "Alteracao auditada.";
    }

    return text(data.status) || text(data.channel) || "Evento registrado.";
  }

  function actorName(userId?: string | null) {
    if (!userId) {
      return "Sistema";
    }

    const user = usersById.get(userId);
    return user ? `${user.name} (${user.role.name})` : "Usuario removido";
  }

  return tabs.map((tab) => {
    const orders = tab.orders.map((order) => {
      const paid = sumPaidPayments(order.payments);

      return {
        id: order.id,
        number: order.number,
        status: order.status,
        statusLabel: salesStatusLabels[order.status],
        total: toNumber(order.total),
        paid,
        remaining: Math.max(0, roundMoney(toNumber(order.total) - paid)),
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          isWeighable: item.product.type === "WEIGHABLE",
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          discount: toNumber(item.discount),
          weightKg: toNumber(item.weightKg),
          totalPrice: toNumber(item.totalPrice),
          scaleReadingId: item.scaleReadingId ?? "",
          scaleDeviceName: item.scaleReading?.scaleDevice?.name ?? "",
          notes: item.notes ?? ""
        }))
      };
    });

    const total = roundMoney(orders.reduce((sum, order) => sum + order.total, 0));
    const paid = roundMoney(orders.reduce((sum, order) => sum + order.paid, 0));
    const tabOrderIds = new Set(tab.orders.map((order) => order.id));
    const tabItemIds = new Set(tab.orders.flatMap((order) => order.items.map((item) => item.id)));
    const tabPaymentIds = new Set(tab.orders.flatMap((order) => order.payments.map((payment) => payment.id)));
    const tabScaleReadingIds = new Set(
      tab.orders.flatMap((order) => order.items.map((item) => item.scaleReadingId).filter((id): id is string => Boolean(id)))
    );
    const manualEvents = tab.orders.flatMap((order) => [
      {
        id: `order-${order.id}`,
        title: "Pedido aberto",
        description: `${salesChannelLabels[order.channel]} ${order.number}`,
        actor: actorName(order.openedBy),
        createdAt: order.openedAt.toISOString(),
        tone: "success" as const
      },
      ...order.items.map((item) => ({
        id: `item-${item.id}`,
        title: "Item lancado",
        description:
          item.product.type === "WEIGHABLE"
            ? `${item.product.name} - ${toNumber(item.weightKg).toLocaleString("pt-BR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
              })} kg`
            : `${item.product.name} - ${toNumber(item.quantity).toLocaleString("pt-BR")} un`,
        actor: actorName(order.openedBy),
        createdAt: order.openedAt.toISOString(),
        tone: "default" as const
      })),
      ...order.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        title: payment.status === "REFUNDED" ? "Pagamento estornado" : "Pagamento lancado",
        description: `${paymentMethodLabels[payment.method]} - ${toNumber(payment.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })}`,
        actor: "Caixa",
        createdAt: (payment.paidAt ?? payment.createdAt).toISOString(),
        tone: payment.status === "REFUNDED" ? ("warning" as const) : ("success" as const)
      }))
    ]);
    const auditEvents = auditLogs
      .filter(
        (log) =>
          (log.entityId && tabOrderIds.has(log.entityId)) ||
          (log.entityId && tabItemIds.has(log.entityId)) ||
          (log.entityId && tabPaymentIds.has(log.entityId)) ||
          (log.entityId && tabScaleReadingIds.has(log.entityId))
      )
      .map((log) => ({
        id: `audit-${log.id}`,
        title: auditLabelByAction[log.action] ?? log.action,
        description: auditDescription(log.action, log.metadata),
        actor: log.user ? `${log.user.name}` : actorName(log.userId),
        createdAt: log.createdAt.toISOString(),
        tone: log.action.includes("cancel") || log.action.includes("refund")
          ? ("warning" as const)
          : log.module === "cash" || log.module === "scale"
            ? ("success" as const)
            : ("default" as const)
      }));
    const history = [...manualEvents, ...auditEvents]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-40);

    return {
      id: tab.id,
      number: tab.number,
      customerName: tab.customerName ?? "",
      openedAt: tab.openedAt.toISOString(),
      ordersCount: orders.length,
      total,
      paid,
      remaining: Math.max(0, roundMoney(total - paid)),
      orders,
      history
    };
  });
}

export async function getOpenCashRegisterSummary() {
  const register = await db.cashRegister.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" }
  });

  if (!register) {
    return null;
  }

  const payments = await db.payment.groupBy({
    by: ["method"],
    where: {
      status: "PAID",
      paidAt: {
        gte: register.openedAt
      }
    },
    _sum: {
      amount: true
    },
    _count: {
      _all: true
    }
  });

  const paymentsTotal = payments.reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
  const movements = await db.cashMovement.findMany({
    where: { cashRegisterId: register.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const movementNet = movements.reduce((sum, item) => {
    const amount = toNumber(item.amount);
    return item.type === "SUPPLY" ? sum + amount : sum - amount;
  }, 0);

  return {
    id: register.id,
    code: register.code,
    status: register.status,
    openedAt: register.openedAt.toISOString(),
    openingAmount: toNumber(register.openingAmount),
    expectedAmount: toNumber(register.openingAmount) + paymentsTotal + movementNet,
    notes: register.notes ?? "",
    movements: movements.map((item) => ({
      id: item.id,
      type: item.type,
      typeLabel: cashMovementLabels[item.type],
      amount: toNumber(item.amount),
      reason: item.reason,
      createdAt: item.createdAt.toISOString()
    })),
    payments: payments.map((item) => ({
      method: item.method,
      methodLabel: paymentMethodLabels[item.method],
      total: toNumber(item._sum.amount),
      count: item._count._all
    }))
  };
}

export async function closeCashRegister(
  data: { closingAmount: number; notes?: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const register = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });

    if (!register) {
      throw new Error("Nao existe caixa aberto para fechamento.");
    }

    const openOrders = await tx.salesOrder.count({
      where: {
        status: {
          in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
        }
      }
    });

    if (openOrders > 0) {
      throw new Error("Existem pedidos em aberto. Quite ou cancele os pedidos antes de fechar o caixa.");
    }

    const payments = await tx.payment.groupBy({
      by: ["method"],
      where: {
        status: "PAID",
        paidAt: {
          gte: register.openedAt
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        _all: true
      }
    });

    const movements = await tx.cashMovement.findMany({
      where: { cashRegisterId: register.id }
    });

    const paymentsTotal = payments.reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
    const movementNet = movements.reduce((sum, item) => {
      const amount = toNumber(item.amount);
      return item.type === "SUPPLY" ? sum + amount : sum - amount;
    }, 0);
    const expectedAmount = Number((toNumber(register.openingAmount) + paymentsTotal + movementNet).toFixed(2));
    const divergence = Number((data.closingAmount - expectedAmount).toFixed(2));

    const closed = await tx.cashRegister.update({
      where: { id: register.id },
      data: {
        status: "CLOSED",
        closedBy: userId,
        closedAt: new Date(),
        closingAmount: data.closingAmount,
        notes: data.notes?.trim()
          ? `${register.notes ? `${register.notes}\n` : ""}Fechamento: ${data.notes.trim()}`
          : register.notes
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "cash",
        action: "close_register",
        entityType: "cash_register",
        entityId: closed.id,
        metadata: {
          code: closed.code,
          openingAmount: toNumber(register.openingAmount),
          paymentsTotal,
          movementNet,
          expectedAmount,
          closingAmount: data.closingAmount,
          divergence,
          payments: payments.map((item) => ({
            method: item.method,
            total: toNumber(item._sum.amount),
            count: item._count._all
          })),
          movementsCount: movements.length
        }
      }
    });

    return {
      id: closed.id,
      code: closed.code,
      status: closed.status,
      expectedAmount,
      closingAmount: data.closingAmount,
      divergence
    };
  });
}

export async function openCashRegister(
  data: { openingAmount: number; notes?: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const alreadyOpen = await tx.cashRegister.findFirst({
      where: { status: "OPEN" }
    });

    if (alreadyOpen) {
      throw new Error("Ja existe um caixa aberto.");
    }

    const register = await tx.cashRegister.create({
      data: {
        code: buildCashRegisterCode(),
        openedBy: userId,
        openingAmount: data.openingAmount,
        notes: data.notes || null
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "cash",
        action: "open_register",
        entityType: "cash_register",
        entityId: register.id,
        metadata: {
          code: register.code,
          openingAmount: data.openingAmount
        }
      }
    });

    return register;
  });
}

export async function createCashMovement(
  data: { type: CashMovementType; amount: number; reason: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const register = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });

    if (!register) {
      throw new Error("Abra um caixa antes de registrar movimentacoes.");
    }

    const movement = await tx.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
        createdBy: userId
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "cash",
        action: data.type === "SUPPLY" ? "cash_supply" : "cash_withdrawal",
        entityType: "cash_movement",
        entityId: movement.id,
        metadata: {
          cashRegisterId: register.id,
          type: data.type,
          amount: data.amount,
          reason: data.reason
        }
      }
    });

    return movement;
  });
}

export async function registerOrderPayments(
  data: { salesOrderId: string; payments: Array<{ method: PaymentMethodType; amount: number }> },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const settings = await getRuntimeOperationSettings(tx);
    const register = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });

    if (!register) {
      throw new Error("Abra um caixa antes de registrar pagamentos.");
    }

    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: data.salesOrderId },
      include: { payments: true }
    });

    const alreadyPaid = sumPaidPayments(order.payments);
    const remaining = Math.max(0, roundMoney(toNumber(order.total) - alreadyPaid));

    if (!data.payments.length) {
      throw new Error("Informe pelo menos uma forma de pagamento.");
    }

    const batchTotal = roundMoney(data.payments.reduce((sum, payment) => sum + payment.amount, 0));

    if (batchTotal > remaining) {
      throw new Error("A soma dos pagamentos excede o saldo restante do pedido.");
    }

    if (!settings.allowPartialPayments && batchTotal < remaining) {
      throw new Error("Pagamento parcial esta desabilitado nas configuracoes.");
    }

    const paidAt = new Date();
    const payments = await Promise.all(
      data.payments.map((payment) =>
        tx.payment.create({
          data: {
            salesOrderId: data.salesOrderId,
            method: payment.method,
            amount: payment.amount,
            status: "PAID",
            paidAt
          }
        })
      )
    );

    const fullyPaid = roundMoney(alreadyPaid + batchTotal) >= roundMoney(toNumber(order.total));

    await tx.salesOrder.update({
      where: { id: data.salesOrderId },
      data: {
        status: fullyPaid ? "PAID" : order.status,
        closedAt: fullyPaid ? new Date() : order.closedAt
      }
    });

    const stockDeduction = fullyPaid && settings.enableAutoStockDeduction
      ? await deductStockForPaidOrder(tx, data.salesOrderId, userId)
      : null;

    if (fullyPaid) {
      await ensureSalesAccountReceivable(
        {
          salesOrderId: order.id,
          customerId: order.customerId,
          number: order.number,
          amount: roundMoney(toNumber(order.total)),
          receivedAmount: roundMoney(alreadyPaid + batchTotal),
          receivedAt: paidAt
        },
        userId,
        tx
      );
    }

    await tx.auditLog.createMany({
      data: payments.map((payment) => ({
        userId,
        module: "cash",
        action: data.payments.length > 1 ? "split_payment" : "register_payment",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          salesOrderId: data.salesOrderId,
          method: payment.method,
          amount: toNumber(payment.amount),
          batchTotal,
          cashRegisterId: register.id,
          cashRegisterCode: register.code
        }
      }))
    });

    return {
      salesOrderId: data.salesOrderId,
      payments,
      fullyPaid,
      remaining: Math.max(0, roundMoney(remaining - batchTotal)),
      stockDeduction
    };
  });
}

export async function refundOrderPayment(data: { paymentId: string; reason: string }, userId: string) {
  return db.$transaction(async (tx) => {
    const register = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });

    if (!register) {
      throw new Error("Abra um caixa antes de estornar pagamentos.");
    }

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: data.paymentId },
      include: {
        salesOrder: {
          include: {
            payments: true
          }
        }
      }
    });

    if (payment.status !== "PAID") {
      throw new Error("Somente pagamentos pagos podem ser estornados.");
    }

    if (payment.salesOrder.status === "CANCELED") {
      throw new Error("Nao e possivel estornar pagamento de pedido cancelado.");
    }

    const total = roundMoney(toNumber(payment.salesOrder.total));
    const paidAfterRefund = roundMoney(
      payment.salesOrder.payments
        .filter((item) => item.status === "PAID" && item.id !== payment.id)
        .reduce((sum, item) => sum + toNumber(item.amount), 0)
    );
    const remaining = Math.max(0, roundMoney(total - paidAfterRefund));
    const shouldReopenOrder = paidAfterRefund < total;

    const refundedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED"
      }
    });

    const orderStatus =
      shouldReopenOrder && payment.salesOrder.status === "PAID"
        ? "DELIVERED"
        : payment.salesOrder.status;

    await tx.salesOrder.update({
      where: { id: payment.salesOrderId },
      data: {
        status: orderStatus,
        closedAt: shouldReopenOrder ? null : payment.salesOrder.closedAt
      }
    });

    await tx.accountReceivable.updateMany({
      where: { salesOrderId: payment.salesOrderId },
      data: {
        receivedAmount: paidAfterRefund,
        status: paidAfterRefund >= total ? "PAID" : "PENDING"
      }
    });

    const stockReturn =
      shouldReopenOrder && payment.salesOrder.stockDeductedAt
        ? await returnStockForRefundedOrder(tx, payment.salesOrderId, userId, data.reason.trim())
        : null;

    await tx.auditLog.create({
      data: {
        userId,
        module: "cash",
        action: "refund_payment",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          salesOrderId: payment.salesOrderId,
          orderNumber: payment.salesOrder.number,
          method: payment.method,
          amount: toNumber(payment.amount),
          paidAfterRefund,
          remaining,
          cashRegisterId: register.id,
          cashRegisterCode: register.code,
          reason: data.reason.trim(),
          stockAlreadyDeducted: Boolean(payment.salesOrder.stockDeductedAt),
          stockReturned: Boolean(stockReturn && !stockReturn.alreadyReturned),
          stockReturn
        }
      }
    });

    return {
      payment: refundedPayment,
      salesOrderId: payment.salesOrderId,
      paid: paidAfterRefund,
      remaining,
      status: orderStatus,
      stockReturn
    };
  });
}
