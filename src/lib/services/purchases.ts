import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ensurePurchaseAccountPayable } from "@/lib/services/financial";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function formatOrderNumber(sequence: number) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `PC-${year}${month}${day}-${String(sequence + 1).padStart(4, "0")}`;
}

function statusLabel(status: PurchaseOrderStatus) {
  const labels: Record<PurchaseOrderStatus, string> = {
    DRAFT: "Rascunho",
    SUBMITTED: "Enviado",
    APPROVED: "Aprovado",
    PARTIALLY_RECEIVED: "Parcial",
    RECEIVED: "Recebido",
    CANCELED: "Cancelado"
  };

  return labels[status];
}

export async function listPurchaseDashboard() {
  const orders = await db.purchaseOrder.findMany({
    include: {
      supplier: true,
      items: {
        include: {
          ingredient: true,
          product: true
        },
        orderBy: {
          id: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 30
  });

  const openOrders = orders.filter((order) => order.status !== "RECEIVED" && order.status !== "CANCELED");
  const pendingAmount = openOrders.reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0);
  const receivedAmount = orders
    .filter((order) => order.status === "RECEIVED")
    .reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0);

  return {
    kpis: {
      ordersCount: orders.length,
      openOrdersCount: openOrders.length,
      pendingAmount,
      receivedAmount
    },
    orders: orders.map((order) => {
      const firstItem = order.items[0];
      const quantity = firstItem ? decimalToNumber(firstItem.quantity) : 0;
      const receivedQty = firstItem ? decimalToNumber(firstItem.receivedQty) : 0;
      const pendingQty = Math.max(quantity - receivedQty, 0);

      return {
        id: order.id,
        number: order.number,
        supplierName: order.supplier.tradeName || order.supplier.corporateName,
        status: order.status,
        statusLabel: statusLabel(order.status),
        totalAmount: decimalToNumber(order.totalAmount),
        expectedAt: order.expectedAt?.toISOString() ?? "",
        receivedAt: order.receivedAt?.toISOString() ?? "",
        itemName: firstItem?.ingredient?.name ?? firstItem?.product?.name ?? "Sem item",
        itemUnit: firstItem?.ingredient?.unit ?? firstItem?.product?.unit ?? "UN",
        quantity,
        receivedQty,
        pendingQty,
        unitPrice: firstItem ? decimalToNumber(firstItem.unitPrice) : 0,
        canCancel:
          order.status !== "CANCELED" &&
          order.status !== "RECEIVED" &&
          order.items.every((item) => decimalToNumber(item.receivedQty) === 0),
        canReceive: pendingQty > 0 && order.status !== "CANCELED"
      };
    })
  };
}

export async function createPurchaseOrder(
  data: {
    supplierId: string;
    ingredientId: string;
    quantity: number;
    unitPrice: number;
    expectedAt?: string;
    notes?: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const [supplier, ingredient, orderCount] = await Promise.all([
      tx.supplier.findUniqueOrThrow({ where: { id: data.supplierId } }),
      tx.ingredient.findUniqueOrThrow({ where: { id: data.ingredientId } }),
      tx.purchaseOrder.count()
    ]);

    if (!supplier.active) {
      throw new Error("Fornecedor inativo nao pode receber pedido de compra.");
    }

    const totalAmount = Number((data.quantity * data.unitPrice).toFixed(2));

    const order = await tx.purchaseOrder.create({
      data: {
        number: formatOrderNumber(orderCount),
        supplierId: supplier.id,
        status: "APPROVED",
        totalAmount,
        requestedBy: userId,
        approvedBy: userId,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : null,
        notes: data.notes || null,
        items: {
          create: {
            ingredientId: ingredient.id,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            totalPrice: totalAmount
          }
        }
      },
      include: {
        items: true
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "purchases",
        action: "purchase_order_create",
        entityType: "purchase_order",
        entityId: order.id,
        metadata: {
          number: order.number,
          supplierId: supplier.id,
          ingredientId: ingredient.id,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalAmount
        }
      }
    });

    return order;
  });
}

export async function receivePurchaseOrder(data: { purchaseOrderId: string; receivedQuantity?: number }, userId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: data.purchaseOrderId },
      include: {
        items: {
          include: {
            ingredient: true
          }
        }
      }
    });

    if (order.status === "CANCELED") {
      throw new Error("Pedido cancelado nao pode ser recebido.");
    }

    if (order.status === "RECEIVED") {
      throw new Error("Pedido ja recebido.");
    }

    let remainingToReceive = data.receivedQuantity ?? Number.POSITIVE_INFINITY;
    const receivedItems = [];
    let currentReceiptAmount = 0;

    for (const item of order.items) {
      if (!item.ingredientId || !item.ingredient) {
        throw new Error("Pedido possui item sem insumo vinculado.");
      }

      const quantity = decimalToNumber(item.quantity);
      const receivedQty = decimalToNumber(item.receivedQty);
      const pendingQty = Number(Math.max(quantity - receivedQty, 0).toFixed(3));

      if (pendingQty <= 0 || remainingToReceive <= 0) {
        continue;
      }

      const quantityToReceive = Number(Math.min(pendingQty, remainingToReceive).toFixed(3));
      const currentStock = decimalToNumber(item.ingredient.currentStock);
      const nextStock = Number((currentStock + quantityToReceive).toFixed(3));
      const unitCost = decimalToNumber(item.unitPrice);
      const nextReceivedQty = Number((receivedQty + quantityToReceive).toFixed(3));

      await tx.stockMovement.create({
        data: {
          ingredientId: item.ingredientId,
          type: "PURCHASE",
          quantity: quantityToReceive,
          unitCost,
          reason: `Recebimento do pedido ${order.number}`,
          referenceType: "purchase_order",
          referenceId: order.id
        }
      });

      await tx.ingredient.update({
        where: { id: item.ingredientId },
        data: {
          currentStock: nextStock,
          cost: unitCost
        }
      });

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          receivedQty: nextReceivedQty
        }
      });

      remainingToReceive = Number((remainingToReceive - quantityToReceive).toFixed(3));
      currentReceiptAmount += Number((quantityToReceive * unitCost).toFixed(2));

      receivedItems.push({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        previousStock: currentStock,
        receivedQty: quantityToReceive,
        totalReceivedQty: nextReceivedQty,
        pendingQty: Number(Math.max(quantity - nextReceivedQty, 0).toFixed(3)),
        nextStock,
        unitCost
      });
    }

    if (receivedItems.length === 0) {
      throw new Error("Nao ha quantidade pendente para recebimento.");
    }

    const freshItems = await tx.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId: order.id
      }
    });
    const allReceived = freshItems.every(
      (item) => decimalToNumber(item.receivedQty) >= decimalToNumber(item.quantity)
    );
    const totalReceivedAmount = freshItems.reduce(
      (sum, item) => sum + decimalToNumber(item.receivedQty) * decimalToNumber(item.unitPrice),
      0
    );

    const updatedOrder = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
        receivedAt: allReceived ? new Date() : order.receivedAt
      }
    });

    const payable = await ensurePurchaseAccountPayable(
      {
        purchaseOrderId: order.id,
        supplierId: order.supplierId,
        number: order.number,
        amount: Number(totalReceivedAmount.toFixed(2)),
        dueDate: order.expectedAt ?? new Date()
      },
      userId,
      tx
    );

    await tx.auditLog.create({
      data: {
        userId,
        module: "purchases",
        action: "purchase_order_receive",
        entityType: "purchase_order",
        entityId: order.id,
        metadata: {
          number: order.number,
          receivedItems,
          requestedReceivedQuantity: data.receivedQuantity ?? null,
          currentReceiptAmount: Number(currentReceiptAmount.toFixed(2)),
          totalReceivedAmount: Number(totalReceivedAmount.toFixed(2)),
          allReceived,
          accountPayableId: payable.id,
          accountPayableAmount: decimalToNumber(payable.amount)
        }
      }
    });

    return {
      order: updatedOrder,
      payable: {
        id: payable.id,
        amount: decimalToNumber(payable.amount),
        dueDate: payable.dueDate.toISOString(),
        paidAmount: decimalToNumber(payable.paidAmount),
        status: payable.status
      },
      receipt: {
        currentReceiptAmount: Number(currentReceiptAmount.toFixed(2)),
        totalReceivedAmount: Number(totalReceivedAmount.toFixed(2)),
        allReceived
      }
    };
  });
}

export async function cancelPurchaseOrder(
  data: {
    purchaseOrderId: string;
    reason: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: data.purchaseOrderId },
      include: {
        items: true
      }
    });

    if (order.status === "CANCELED") {
      throw new Error("Pedido de compra ja esta cancelado.");
    }

    if (order.status === "RECEIVED") {
      throw new Error("Pedido de compra recebido nao pode ser cancelado.");
    }

    const receivedQuantity = order.items.reduce(
      (sum, item) => sum + decimalToNumber(item.receivedQty),
      0
    );

    if (receivedQuantity > 0) {
      throw new Error("Pedido com recebimento parcial nao pode ser cancelado por esta acao.");
    }

    const canceledOrder = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        notes: order.notes ? `${order.notes}\nCancelamento: ${data.reason}` : `Cancelamento: ${data.reason}`,
        status: "CANCELED"
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "purchases",
        action: "purchase_order_cancel",
        entityType: "purchase_order",
        entityId: order.id,
        metadata: {
          number: order.number,
          previousStatus: order.status,
          reason: data.reason,
          totalAmount: decimalToNumber(order.totalAmount)
        }
      }
    });

    return canceledOrder;
  });
}
