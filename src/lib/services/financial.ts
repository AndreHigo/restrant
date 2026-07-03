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

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    CREDIT_CARD: "Credito",
    DEBIT_CARD: "Debito",
    PIX: "PIX",
    VOUCHER: "Voucher",
    BANK_TRANSFER: "Transferencia"
  };

  return labels[method] ?? method;
}

function startOfLocalDay(value?: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfLocalDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function jsonNumber(value: Prisma.JsonValue | null | undefined, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  const raw = value[key as keyof typeof value];
  return typeof raw === "number" ? raw : 0;
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

export async function ensureSalesAccountReceivable(
  data: {
    salesOrderId: string;
    customerId?: string | null;
    number: string;
    amount: number;
    receivedAmount: number;
    receivedAt?: Date | null;
  },
  userId: string,
  tx: Prisma.TransactionClient = db
) {
  const receivable = await tx.accountReceivable.upsert({
    where: {
      salesOrderId: data.salesOrderId
    },
    create: {
      description: `Venda ${data.number}`,
      customerId: data.customerId || null,
      salesOrderId: data.salesOrderId,
      dueDate: data.receivedAt ?? new Date(),
      amount: data.amount,
      receivedAmount: data.receivedAmount,
      status: data.receivedAmount >= data.amount ? "PAID" : "PENDING"
    },
    update: {
      customerId: data.customerId || null,
      amount: data.amount,
      receivedAmount: data.receivedAmount,
      status: data.receivedAmount >= data.amount ? "PAID" : "PENDING"
    }
  });

  await tx.auditLog.create({
    data: {
      userId,
      module: "financial",
      action: "account_receivable_from_sale",
      entityType: "account_receivable",
      entityId: receivable.id,
      metadata: {
        salesOrderId: data.salesOrderId,
        number: data.number,
        amount: data.amount,
        receivedAmount: data.receivedAmount
      }
    }
  });

  return receivable;
}

export async function listFinancialDashboard() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [payables, receivables, cashRegisters, payments, cashMovements] = await Promise.all([
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
      include: {
        customer: true,
        salesOrder: true
      },
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
    }),
    db.payment.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: since
        }
      }
    }),
    db.cashMovement.findMany({
      where: {
        createdAt: {
          gte: since
        }
      }
    })
  ]);

  const pendingPayables = payables.filter((item) => item.status === "PENDING");
  const paidPayables = payables.filter((item) => item.status === "PAID");
  const pendingReceivables = receivables.filter((item) => item.status === "PENDING");
  const paidReceivables = receivables.filter((item) => item.status === "PAID");
  const overduePayables = pendingPayables.filter((item) => item.dueDate < new Date());
  const salesInflow = payments.reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
  const paidOutflow = paidPayables.reduce((sum, item) => sum + decimalToNumber(item.paidAmount), 0);
  const supplies = cashMovements
    .filter((item) => item.type === "SUPPLY")
    .reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
  const withdrawals = cashMovements
    .filter((item) => item.type === "WITHDRAWAL")
    .reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
  const totalInflows = salesInflow + supplies;
  const totalOutflows = paidOutflow + withdrawals;
  const paymentMethods = Array.from(
    payments.reduce<Map<string, { method: string; amount: number; count: number }>>((map, payment) => {
      const current = map.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 };
      current.amount += decimalToNumber(payment.amount);
      current.count += 1;
      map.set(payment.method, current);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.amount - a.amount);

  return {
    kpis: {
      pendingPayableAmount: pendingPayables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      paidPayableAmount: paidPayables.reduce((sum, item) => sum + decimalToNumber(item.paidAmount), 0),
      pendingReceivableAmount: pendingReceivables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      receivedAmount: paidReceivables.reduce((sum, item) => sum + decimalToNumber(item.receivedAmount), 0),
      overduePayablesCount: overduePayables.length
    },
    cashFlow: {
      periodLabel: "Ultimos 30 dias",
      salesInflow,
      supplies,
      paidOutflow,
      withdrawals,
      totalInflows,
      totalOutflows,
      netCashFlow: totalInflows - totalOutflows,
      paymentMethods: paymentMethods.map((item) => ({
        ...item,
        label: paymentMethodLabel(item.method)
      }))
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
      customerName: item.customer?.name ?? (item.salesOrder?.tabId ? "Comanda" : "Consumidor final"),
      salesOrderNumber: item.salesOrder?.number ?? "",
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

export async function listDailyCashClosing(dateValue?: string) {
  const start = startOfLocalDay(dateValue);
  const end = endOfLocalDay(start);
  const selectedDate = start.toISOString().slice(0, 10);

  const [
    registers,
    payments,
    movements,
    paidPayables,
    orders,
    refundLogs
  ] = await Promise.all([
    db.cashRegister.findMany({
      where: {
        OR: [
          {
            openedAt: {
              lte: end
            },
            closedAt: null
          },
          {
            openedAt: {
              lte: end
            },
            closedAt: {
              gte: start
            }
          },
          {
            openedAt: {
              gte: start,
              lte: end
            }
          }
        ]
      },
      orderBy: {
        openedAt: "asc"
      }
    }),
    db.payment.findMany({
      where: {
        paidAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        salesOrder: {
          include: {
            tab: true,
            table: true
          }
        }
      },
      orderBy: {
        paidAt: "asc"
      }
    }),
    db.cashMovement.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.accountPayable.findMany({
      where: {
        status: "PAID",
        updatedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        supplier: true,
        purchaseOrder: true
      },
      orderBy: {
        updatedAt: "asc"
      }
    }),
    db.salesOrder.findMany({
      where: {
        OR: [
          {
            openedAt: {
              gte: start,
              lte: end
            }
          },
          {
            closedAt: {
              gte: start,
              lte: end
            }
          }
        ]
      },
      include: {
        tab: true,
        table: true,
        payments: true
      },
      orderBy: {
        openedAt: "asc"
      }
    }),
    db.auditLog.findMany({
      where: {
        module: "cash",
        action: "refund_payment",
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  const validPayments = payments.filter((payment) => payment.status === "PAID");
  const refundedPayments = payments.filter((payment) => payment.status === "REFUNDED");
  const receivedByMethod = Array.from(
    validPayments.reduce<Map<string, { method: string; amount: number; count: number }>>((map, payment) => {
      const current = map.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 };
      current.amount += decimalToNumber(payment.amount);
      current.count += 1;
      map.set(payment.method, current);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.amount - a.amount);

  const supplies = movements
    .filter((movement) => movement.type === "SUPPLY")
    .reduce((sum, movement) => sum + decimalToNumber(movement.amount), 0);
  const withdrawals = movements
    .filter((movement) => movement.type === "WITHDRAWAL")
    .reduce((sum, movement) => sum + decimalToNumber(movement.amount), 0);
  const paymentsTotal = validPayments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
  const refundedByAudit = refundLogs.reduce((sum, log) => sum + jsonNumber(log.metadata, "amount"), 0);
  const refundedByPaidDate = refundedPayments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
  const payableOutflow = paidPayables.reduce((sum, payable) => sum + decimalToNumber(payable.paidAmount), 0);
  const openingTotal = registers.reduce((sum, register) => sum + decimalToNumber(register.openingAmount), 0);
  const closingTotal = registers.reduce((sum, register) => sum + decimalToNumber(register.closingAmount), 0);
  const expectedCash = openingTotal + paymentsTotal + supplies - withdrawals;
  const cashDifference = closingTotal > 0 ? closingTotal - expectedCash : 0;

  const ordersPaid = orders.filter((order) => order.status === "PAID").length;
  const ordersOpen = orders.filter((order) => ["OPEN", "PREPARING", "READY", "DELIVERED"].includes(order.status)).length;
  const ordersCanceled = orders.filter((order) => order.status === "CANCELED").length;

  return {
    selectedDate,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    kpis: {
      registersCount: registers.length,
      openRegistersCount: registers.filter((register) => register.status === "OPEN").length,
      closedRegistersCount: registers.filter((register) => register.status === "CLOSED").length,
      paymentsTotal,
      refundedToday: refundedByAudit,
      refundedFromPaymentsPaidToday: refundedByPaidDate,
      supplies,
      withdrawals,
      payableOutflow,
      netCashMovement: paymentsTotal + supplies - withdrawals - payableOutflow,
      openingTotal,
      closingTotal,
      expectedCash,
      cashDifference,
      ordersPaid,
      ordersOpen,
      ordersCanceled
    },
    paymentMethods: receivedByMethod.map((item) => ({
      ...item,
      label: paymentMethodLabel(item.method)
    })),
    registers: registers.map((register) => {
      const registerEnd = register.closedAt ?? end;
      const registerPayments = validPayments.filter(
        (payment) => payment.paidAt && payment.paidAt >= register.openedAt && payment.paidAt <= registerEnd
      );
      const registerMovements = movements.filter(
        (movement) => movement.createdAt >= register.openedAt && movement.createdAt <= registerEnd
      );
      const registerSupplies = registerMovements
        .filter((movement) => movement.type === "SUPPLY")
        .reduce((sum, movement) => sum + decimalToNumber(movement.amount), 0);
      const registerWithdrawals = registerMovements
        .filter((movement) => movement.type === "WITHDRAWAL")
        .reduce((sum, movement) => sum + decimalToNumber(movement.amount), 0);
      const registerPaymentsTotal = registerPayments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
      const expectedAmount = decimalToNumber(register.openingAmount) + registerPaymentsTotal + registerSupplies - registerWithdrawals;
      const closingAmount = decimalToNumber(register.closingAmount);

      return {
        id: register.id,
        code: register.code,
        status: register.status,
        openedAt: register.openedAt.toISOString(),
        closedAt: register.closedAt?.toISOString() ?? null,
        openingAmount: decimalToNumber(register.openingAmount),
        paymentsTotal: registerPaymentsTotal,
        supplies: registerSupplies,
        withdrawals: registerWithdrawals,
        expectedAmount,
        closingAmount,
        difference: register.closedAt ? closingAmount - expectedAmount : 0,
        paymentsCount: registerPayments.length,
        movementsCount: registerMovements.length
      };
    }),
    refunds: refundLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      amount: jsonNumber(log.metadata, "amount"),
      method:
        log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata) && typeof log.metadata.method === "string"
          ? paymentMethodLabel(log.metadata.method)
          : "Nao informado",
      orderNumber:
        log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata) && typeof log.metadata.orderNumber === "string"
          ? log.metadata.orderNumber
          : "-"
    })),
    payablePayments: paidPayables.map((payable) => ({
      id: payable.id,
      description: payable.description,
      supplierName: payable.supplier?.tradeName || payable.supplier?.corporateName || "Sem fornecedor",
      purchaseOrderNumber: payable.purchaseOrder?.number ?? "",
      paidAmount: decimalToNumber(payable.paidAmount),
      updatedAt: payable.updatedAt.toISOString()
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
