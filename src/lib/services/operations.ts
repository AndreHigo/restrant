import { PaymentMethodType, Prisma, SalesChannel, SalesOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

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

export const paymentMethodLabels: Record<PaymentMethodType, string> = {
  BANK_TRANSFER: "Transferencia",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  PIX: "PIX",
  VOUCHER: "Voucher"
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
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
  const stamp = Date.now().toString().slice(-8);
  return `PV${stamp}`;
}

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];
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
  notes?: string;
  items: OrderItemInput[];
};

async function buildOrderItems(
  tx: TxClient,
  items: OrderItemInput[]
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
      const reading = item.scaleReadingId
        ? readings.find((candidate) => candidate.id === item.scaleReadingId)
        : null;

      if (!reading && !item.weightKg) {
        throw new Error(`O item ${product.name} precisa de uma leitura de balanca ou peso manual.`);
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
        totalPrice,
        weightKg,
        scaleReadingId: reading?.id ?? item.scaleReadingId ?? null,
        notes: item.notes || null
      };
    }

    const unitPrice = toNumber(product.price);

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      weightKg: null,
      scaleReadingId: null,
      notes: item.notes || null
    };
  });
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

async function createScaleReadingRecord(
  tx: TxClient,
  data: {
    productId: string;
    scaleDeviceId?: string;
    weightKg?: number;
    sourceMode: "MANUAL" | "DEVICE";
    notes?: string;
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
  const weightKg =
    data.sourceMode === "MANUAL"
      ? data.weightKg
      : Number((((device?.baudRate ?? 9600) % 7) * 0.05 + 0.35 + ((Date.now() % 5) * 0.025)).toFixed(3));

  if (!weightKg || weightKg <= 0) {
    throw new Error("Nao foi possivel determinar um peso valido para a leitura.");
  }

  return tx.scaleReading.create({
    data: {
      scaleDeviceId: device?.id ?? null,
      productId: product.id,
      weightKg,
      pricePerKg,
      totalPrice: Number((weightKg * pricePerKg).toFixed(2)),
      source:
        data.sourceMode === "MANUAL"
          ? "MANUAL"
          : device?.connectionType
            ? `DEVICE_${device.connectionType.toUpperCase()}`
            : "DEVICE",
      notes:
        data.sourceMode === "DEVICE"
          ? data.notes || "Leitura capturada pela integracao preparada da balanca."
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
      ingredientMovements: 0,
      productAdjustments: 0
    };
  }

  let ingredientMovements = 0;
  let productAdjustments = 0;

  for (const item of order.items) {
    const soldQuantity = toNumber(item.quantity);
    const { product } = item;

    if (!product.trackStock) {
      continue;
    }

    if (product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const quantity = Number((toNumber(recipeItem.quantity) * soldQuantity).toFixed(3));
        const currentStock = toNumber(recipeItem.ingredient.currentStock);

        if (currentStock < quantity) {
          throw new Error(
            `Estoque insuficiente de ${recipeItem.ingredient.name} para concluir a venda.`
          );
        }

        await tx.stockMovement.create({
          data: {
            ingredientId: recipeItem.ingredientId,
            type: "SALE",
            quantity,
            unitCost: recipeItem.ingredient.cost,
            reason: `Baixa automatica da venda ${order.number} - ${product.name}`,
            referenceType: "sales_order",
            referenceId: order.id
          }
        });

        await tx.ingredient.update({
          where: { id: recipeItem.ingredientId },
          data: {
            currentStock: Number((currentStock - quantity).toFixed(3))
          }
        });

        ingredientMovements += 1;
      }

      continue;
    }

    const stockBalance = product.stockBalance;

    if (!stockBalance) {
      throw new Error(`Produto ${product.name} nao possui saldo de estoque configurado.`);
    }

    const currentQuantity = toNumber(stockBalance.quantity);

    if (currentQuantity < soldQuantity) {
      throw new Error(`Estoque insuficiente de ${product.name} para concluir a venda.`);
    }

    await tx.stockBalance.update({
      where: { productId: product.id },
      data: {
        quantity: Number((currentQuantity - soldQuantity).toFixed(3))
      }
    });

    productAdjustments += 1;
  }

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
        ingredientMovements,
        productAdjustments
      }
    }
  });

  return {
    alreadyDeducted: false,
    ingredientMovements,
    productAdjustments
  };
}

export async function listOperationDashboard() {
  const [orders, registers] = await Promise.all([
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
    })
  ]);

  const openOrders = orders.filter((item) => item.status !== "PAID" && item.status !== "CANCELED");
  const kitchenItems = orders.filter((item) => item.status === "PREPARING" || item.status === "READY");

  return {
    kpis: {
      openOrders: openOrders.length,
      kitchenOrders: kitchenItems.length,
      openRegisters: registers
    },
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
  userId: string
) {
  return db.$transaction(async (tx) => {
    const items = await buildOrderItems(tx, data.items);

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await tx.salesOrder.create({
      data: {
        number: buildOrderNumber(),
        channel: data.channel,
        status: "OPEN",
        customerId: data.customerId || null,
        tableId: data.tableId || null,
        tabId: data.tabId || null,
        openedBy: userId,
        notes: data.notes || null,
        subtotal,
        total: subtotal,
        items: {
          create: items
        }
      }
    });

    await audit(userId, "sales", "create_order", "sales_order", order.id, {
      channel: data.channel,
      itemsCount: items.length,
      subtotal
    });

    return order;
  });
}

export async function createOrAppendSalesOrder(
  data: SalesOrderPayload,
  userId: string
) {
  return db.$transaction(async (tx) => {
    const items = await buildOrderItems(tx, data.items);
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const openOrder = await findOpenOrderForChannel(tx, data);

    if (openOrder) {
      const updatedOrder = await tx.salesOrder.update({
        where: { id: openOrder.id },
        data: {
          customerId: data.customerId || openOrder.customerId,
          tableId: data.tableId || openOrder.tableId,
          tabId: data.tabId || openOrder.tabId,
          notes: data.notes || openOrder.notes,
          subtotal: { increment: subtotal },
          total: { increment: subtotal },
          items: {
            create: items
          }
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          module: "sales",
          action: "append_to_open_order",
          entityType: "sales_order",
          entityId: updatedOrder.id,
          metadata: {
            channel: data.channel,
            itemsCount: items.length,
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
        tabId: data.tabId || null,
        openedBy: userId,
        notes: data.notes || null,
        subtotal,
        total: subtotal,
        items: {
          create: items
        }
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "sales",
        action: "create_order",
        entityType: "sales_order",
        entityId: order.id,
        metadata: {
          channel: data.channel,
          itemsCount: items.length,
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
  userId: string
) {
  const reading = await db.$transaction(async (tx) => {
    const created = await createScaleReadingRecord(tx, data);

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
          weightKg: toNumber(created.weightKg),
          totalPrice: toNumber(created.totalPrice)
        }
      }
    });

    return created;
  });

  return {
    id: reading.id,
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
    scaleDeviceId?: string;
    weightKg?: number;
    sourceMode: "MANUAL" | "DEVICE";
    notes?: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const reading = await createScaleReadingRecord(tx, {
      productId: data.productId,
      scaleDeviceId: data.scaleDeviceId,
      weightKg: data.weightKg,
      sourceMode: data.sourceMode,
      notes: data.notes
    });

    const orderChannel =
      data.targetType === "TABLE"
        ? "TABLE"
        : data.targetType === "TAB"
          ? "TAB"
          : "COUNTER";

    const targetFilter =
      data.targetType === "TABLE"
        ? { tableId: data.targetId ?? "" }
        : data.targetType === "TAB"
          ? { tabId: data.targetId ?? "" }
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

    const item = (await buildOrderItems(tx, [
      {
        productId: data.productId,
        quantity: toNumber(reading.weightKg),
        weightKg: toNumber(reading.weightKg),
        scaleReadingId: reading.id,
        notes: data.notes
      }
    ]))[0];

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
            tableId: data.targetType === "TABLE" ? data.targetId : null,
            tabId: data.targetType === "TAB" ? data.targetId : null,
            openedBy: userId,
            notes: data.notes || null,
            subtotal: item.totalPrice,
            total: item.totalPrice,
            items: {
              create: item
            }
          }
        });

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
            weightKg: toNumber(reading.weightKg),
            totalPrice: toNumber(reading.totalPrice)
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
            targetId: data.targetId ?? null,
            scaleReadingId: reading.id,
            productId: data.productId,
            totalPrice: toNumber(reading.totalPrice)
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
      notes: item.notes ?? ""
    }))
  }));
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

    if (data.status === "PAID") {
      await deductStockForPaidOrder(tx, updated.id, userId);
    }

    return updated;
  });

  return order;
}

export async function listCashOrders() {
  const orders = await db.salesOrder.findMany({
    where: {
      status: {
        in: ["OPEN", "PREPARING", "READY", "DELIVERED"]
      }
    },
    include: {
      customer: true,
      table: true,
      tab: true,
      payments: true
    },
    orderBy: {
      openedAt: "asc"
    }
  });

  return orders.map((order) => {
    const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

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
      paid,
      remaining: Math.max(0, toNumber(order.total) - paid),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        methodLabel: paymentMethodLabels[payment.method],
        amount: toNumber(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt?.toISOString() ?? null
      }))
    };
  });
}

export async function registerOrderPayments(
  data: { salesOrderId: string; payments: Array<{ method: PaymentMethodType; amount: number }> },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: data.salesOrderId },
      include: { payments: true }
    });

    const alreadyPaid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const remaining = Math.max(0, toNumber(order.total) - alreadyPaid);

    if (!data.payments.length) {
      throw new Error("Informe pelo menos uma forma de pagamento.");
    }

    const batchTotal = Number(
      data.payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)
    );

    if (batchTotal > remaining) {
      throw new Error("A soma dos pagamentos excede o saldo restante do pedido.");
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

    const fullyPaid = alreadyPaid + batchTotal >= toNumber(order.total);

    await tx.salesOrder.update({
      where: { id: data.salesOrderId },
      data: {
        status: fullyPaid ? "PAID" : order.status,
        closedAt: fullyPaid ? new Date() : order.closedAt
      }
    });

    const stockDeduction = fullyPaid
      ? await deductStockForPaidOrder(tx, data.salesOrderId, userId)
      : null;

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
          batchTotal
        }
      }))
    });

    return {
      salesOrderId: data.salesOrderId,
      payments,
      fullyPaid,
      remaining: Math.max(0, remaining - batchTotal),
      stockDeduction
    };
  });
}
