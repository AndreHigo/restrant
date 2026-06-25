import { PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function statusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    CANCELED: "Cancelado",
    REFUNDED: "Estornado"
  };

  return labels[status];
}

export async function ensurePurchaseAccountPayable(
  data: {
    purchaseOrderId: string;
    supplierId: string;
    number: string;
    amount: number;
    dueDate?: Date | null;
  },
  userId: string,
  tx: Prisma.TransactionClient = db
) {
  const payable = await tx.accountPayable.upsert({
    where: {
      purchaseOrderId: data.purchaseOrderId
    },
    create: {
      description: `Pedido de compra ${data.number}`,
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
      dueDate: data.dueDate ?? new Date(),
      amount: data.amount,
      paidAmount: 0,
      status: "PENDING"
    },
    update: {
      supplierId: data.supplierId,
      dueDate: data.dueDate ?? new Date(),
      amount: data.amount
    }
  });

  await tx.auditLog.create({
    data: {
      userId,
      module: "financial",
      action: "account_payable_from_purchase",
      entityType: "account_payable",
      entityId: payable.id,
      metadata: {
        purchaseOrderId: data.purchaseOrderId,
        number: data.number,
        amount: data.amount
      }
    }
  });

  return payable;
}

export async function listFinancialDashboard() {
  const [payables, receivables, cashRegisters] = await Promise.all([
    db.accountPayable.findMany({
      include: {
        supplier: true,
        purchaseOrder: true
      },
      orderBy: {
        dueDate: "asc"
      },
      take: 40
    }),
    db.accountReceivable.findMany({
      orderBy: {
        dueDate: "asc"
      },
      take: 40
    }),
    db.cashRegister.findMany({
      orderBy: {
        openedAt: "desc"
      },
      take: 10
    })
  ]);

  const pendingPayables = payables.filter((item) => item.status === "PENDING");
  const paidPayables = payables.filter((item) => item.status === "PAID");
  const pendingReceivables = receivables.filter((item) => item.status === "PENDING");
  const overduePayables = pendingPayables.filter((item) => item.dueDate < new Date());

  return {
    kpis: {
      pendingPayableAmount: pendingPayables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      paidPayableAmount: paidPayables.reduce((sum, item) => sum + decimalToNumber(item.paidAmount), 0),
      pendingReceivableAmount: pendingReceivables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      overduePayablesCount: overduePayables.length
    },
    payables: payables.map((item) => ({
      id: item.id,
      description: item.description,
      supplierName: item.supplier?.tradeName || item.supplier?.corporateName || "Sem fornecedor",
      purchaseOrderNumber: item.purchaseOrder?.number ?? "",
      dueDate: item.dueDate.toISOString(),
      amount: decimalToNumber(item.amount),
      paidAmount: decimalToNumber(item.paidAmount),
      status: item.status,
      statusLabel: statusLabel(item.status),
      overdue: item.status === "PENDING" && item.dueDate < new Date(),
      canPay: item.status === "PENDING"
    })),
    receivables: receivables.map((item) => ({
      id: item.id,
      description: item.description,
      dueDate: item.dueDate.toISOString(),
      amount: decimalToNumber(item.amount),
      receivedAmount: decimalToNumber(item.receivedAmount),
      status: item.status,
      statusLabel: statusLabel(item.status)
    })),
    cashRegisters: cashRegisters.map((item) => ({
      id: item.id,
      code: item.code,
      status: item.status,
      openedAt: item.openedAt.toISOString(),
      openingAmount: decimalToNumber(item.openingAmount),
      closingAmount: decimalToNumber(item.closingAmount)
    }))
  };
}

export async function payAccountPayable(data: { accountPayableId: string }, userId: string) {
  return db.$transaction(async (tx) => {
    const payable = await tx.accountPayable.findUniqueOrThrow({
      where: {
        id: data.accountPayableId
      }
    });

    if (payable.status !== "PENDING") {
      throw new Error("Apenas contas pendentes podem ser baixadas.");
    }

    const amount = decimalToNumber(payable.amount);
    const updated = await tx.accountPayable.update({
      where: {
        id: payable.id
      },
      data: {
        paidAmount: amount,
        status: "PAID"
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "financial",
        action: "account_payable_paid",
        entityType: "account_payable",
        entityId: payable.id,
        metadata: {
          amount,
          purchaseOrderId: payable.purchaseOrderId
        }
      }
    });

    return updated;
  });
}
