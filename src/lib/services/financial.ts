import { PaymentMethodType, PaymentStatus, Prisma } from "@prisma/client";
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

function jsonString(value: Prisma.JsonValue | null | undefined, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const raw = value[key as keyof typeof value];
  return typeof raw === "string" ? raw : "";
}

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvMoney(value: number) {
  return value.toFixed(2).replace(".", ",");
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingLimit = new Date(today);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);

  const [payables, receivables, cashRegisters, payments, cashMovements, configuredPaymentMethods] = await Promise.all([
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
    }),
    db.paymentMethod.findMany({
      where: {
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const pendingPayables = payables.filter((item) => item.status === "PENDING");
  const paidPayables = payables.filter((item) => item.status === "PAID");
  const pendingReceivables = receivables.filter((item) => item.status === "PENDING");
  const paidReceivables = receivables.filter((item) => item.status === "PAID");
  const overduePayables = pendingPayables.filter((item) => item.dueDate < today);
  const overdueReceivables = pendingReceivables.filter((item) => item.dueDate < today);
  const upcomingReceivables = pendingReceivables.filter(
    (item) => item.dueDate >= today && item.dueDate <= upcomingLimit
  );
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
  const paymentMethodConfigByType = configuredPaymentMethods.reduce<
    Map<string, { label: string; feePercentage: number }>
  >((map, method) => {
    map.set(method.type, {
      label: method.name || paymentMethodLabel(method.type),
      feePercentage: decimalToNumber(method.feePercentage)
    });
    return map;
  }, new Map());
  const paymentMethodsWithFees = paymentMethods.map((item) => {
    const config = paymentMethodConfigByType.get(item.method);
    const feePercentage = config?.feePercentage ?? 0;
    const feeAmount = Number(((item.amount * feePercentage) / 100).toFixed(2));

    return {
      ...item,
      label: config?.label ?? paymentMethodLabel(item.method),
      feePercentage,
      feeAmount,
      netAmount: Number((item.amount - feeAmount).toFixed(2))
    };
  });
  const cardFeeAmount = paymentMethodsWithFees.reduce((sum, item) => sum + item.feeAmount, 0);

  return {
    kpis: {
      pendingPayableAmount: pendingPayables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      paidPayableAmount: paidPayables.reduce((sum, item) => sum + decimalToNumber(item.paidAmount), 0),
      pendingReceivableAmount: pendingReceivables.reduce((sum, item) => sum + decimalToNumber(item.amount), 0),
      receivedAmount: paidReceivables.reduce((sum, item) => sum + decimalToNumber(item.receivedAmount), 0),
      overduePayablesCount: overduePayables.length,
      overdueReceivablesAmount: overdueReceivables.reduce(
        (sum, item) => sum + Math.max(0, decimalToNumber(item.amount) - decimalToNumber(item.receivedAmount)),
        0
      ),
      overdueReceivablesCount: overdueReceivables.length,
      upcomingReceivablesCount: upcomingReceivables.length
    },
    cashFlow: {
      periodLabel: "Ultimos 30 dias",
      salesInflow,
      supplies,
      paidOutflow,
      withdrawals,
      cardFeeAmount,
      totalInflows,
      totalOutflows,
      netCashFlow: totalInflows - totalOutflows,
      netAfterFees: totalInflows - totalOutflows - cardFeeAmount,
      paymentMethods: paymentMethodsWithFees
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
      remaining: Math.max(0, decimalToNumber(item.amount) - decimalToNumber(item.paidAmount)),
      canPay: item.status === "PENDING" && decimalToNumber(item.paidAmount) < decimalToNumber(item.amount)
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
      statusLabel: statusLabel(item.status),
      remaining: Math.max(0, decimalToNumber(item.amount) - decimalToNumber(item.receivedAmount)),
      overdue: item.status === "PENDING" && item.dueDate < today,
      dueToday:
        item.status === "PENDING" &&
        item.dueDate >= today &&
        item.dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000),
      upcoming:
        item.status === "PENDING" &&
        item.dueDate >= today &&
        item.dueDate <= upcomingLimit,
      canReceive: item.status === "PENDING" && decimalToNumber(item.receivedAmount) < decimalToNumber(item.amount)
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
    refundLogs,
    receivableLogs,
    reconciliationLogs
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
    }),
    db.auditLog.findMany({
      where: {
        module: "financial",
        action: {
          in: ["account_receivable_received", "account_receivable_partial_received"]
        },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.auditLog.findMany({
      where: {
        module: "financial",
        action: "payment_method_reconciliation",
        entityType: "payment_reconciliation",
        entityId: {
          startsWith: `${selectedDate}:`
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
  const reconciliationByMethod = reconciliationLogs.reduce<Map<string, (typeof reconciliationLogs)[number]>>((map, log) => {
    const method = jsonString(log.metadata, "method");

    if (method) {
      map.set(method, log);
    }

    return map;
  }, new Map());

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
  const receivableReceiptsTotal = receivableLogs.reduce((sum, log) => sum + jsonNumber(log.metadata, "receiptAmount"), 0);
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
      receivableReceiptsTotal,
      supplies,
      withdrawals,
      payableOutflow,
      netCashMovement: paymentsTotal + receivableReceiptsTotal + supplies - withdrawals - payableOutflow,
      openingTotal,
      closingTotal,
      expectedCash,
      cashDifference,
      ordersPaid,
      ordersOpen,
      ordersCanceled
    },
    paymentMethods: receivedByMethod.map((item) => {
      const reconciliation = reconciliationByMethod.get(item.method);
      const countedAmount = reconciliation ? jsonNumber(reconciliation.metadata, "countedAmount") : 0;
      const divergence = reconciliation ? jsonNumber(reconciliation.metadata, "divergence") : 0;

      return {
        ...item,
        label: paymentMethodLabel(item.method),
        reconciled: Boolean(reconciliation),
        countedAmount,
        divergence,
        reconciledAt: reconciliation?.createdAt.toISOString() ?? null,
        reconciliationNotes: reconciliation ? jsonString(reconciliation.metadata, "notes") : ""
      };
    }),
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
    })),
    receivableReceipts: receivableLogs.map((log) => ({
      id: log.id,
      description: jsonString(log.metadata, "description") || "Conta a receber",
      salesOrderNumber: jsonString(log.metadata, "salesOrderNumber"),
      receiptAmount: jsonNumber(log.metadata, "receiptAmount"),
      receivedAmount: jsonNumber(log.metadata, "receivedAmount"),
      totalAmount: jsonNumber(log.metadata, "totalAmount"),
      remaining: jsonNumber(log.metadata, "remaining"),
      notes: jsonString(log.metadata, "notes"),
      userName: log.user?.name ?? "Sistema",
      createdAt: log.createdAt.toISOString(),
      statusLabel: log.action === "account_receivable_received" ? "Recebido" : "Parcial"
    }))
  };
}

type DailyCashClosingResult = Awaited<ReturnType<typeof listDailyCashClosing>>;

export function dailyCashClosingToCsv(report: DailyCashClosingResult) {
  const header = ["Secao", "Codigo", "Descricao", "Quantidade", "Valor", "Status", "Data"];
  const rows: Array<Array<string | number>> = [
    ["Resumo", "periodo", "Data do fechamento", "", report.selectedDate, "", ""],
    ["Resumo", "caixas", "Caixas considerados", report.kpis.registersCount, "", "", ""],
    ["Resumo", "recebido", "Recebido liquido", "", csvMoney(report.kpis.paymentsTotal), "", ""],
    ["Resumo", "recebimentos-financeiros", "Recebimentos financeiros", report.receivableReceipts.length, csvMoney(report.kpis.receivableReceiptsTotal), "", ""],
    ["Resumo", "estornos", "Estornos auditados", report.refunds.length, csvMoney(report.kpis.refundedToday), "", ""],
    ["Resumo", "movimento", "Movimento liquido", "", csvMoney(report.kpis.netCashMovement), "", ""],
    ["Resumo", "divergencia", "Divergencia de caixa", "", csvMoney(report.kpis.cashDifference), "", ""],
    ["Resumo", "pedidos-pagos", "Pedidos pagos", report.kpis.ordersPaid, "", "", ""],
    ["Resumo", "pedidos-abertos", "Pedidos abertos", report.kpis.ordersOpen, "", "", ""],
    ["Resumo", "pedidos-cancelados", "Pedidos cancelados", report.kpis.ordersCanceled, "", "", ""],
    ...report.paymentMethods.map((method) => [
      "Forma de pagamento",
      method.method,
      method.label,
      method.count,
      csvMoney(method.amount),
      method.reconciled ? `Conciliado | Conferido ${csvMoney(method.countedAmount)} | Dif. ${csvMoney(method.divergence)}` : "Pendente",
      report.selectedDate
    ]),
    ...report.registers.map((register) => [
      "Caixa",
      register.code,
      `Abertura ${csvMoney(register.openingAmount)} | Recebido ${csvMoney(register.paymentsTotal)} | Esperado ${csvMoney(register.expectedAmount)} | Contado ${csvMoney(register.closingAmount)}`,
      register.paymentsCount,
      csvMoney(register.difference),
      register.status,
      register.closedAt ?? register.openedAt
    ]),
    ...report.refunds.map((refund) => [
      "Estorno",
      refund.orderNumber,
      refund.method,
      1,
      csvMoney(refund.amount),
      "Estornado",
      refund.createdAt
    ]),
    ...report.payablePayments.map((payable) => [
      "Conta paga",
      payable.purchaseOrderNumber || payable.id,
      `${payable.description} - ${payable.supplierName}`,
      1,
      csvMoney(payable.paidAmount),
      "Pago",
      payable.updatedAt
    ]),
    ...report.receivableReceipts.map((receipt) => [
      "Conta recebida",
      receipt.salesOrderNumber || receipt.id,
      `${receipt.description} - ${receipt.userName}`,
      1,
      csvMoney(receipt.receiptAmount),
      `${receipt.statusLabel} | Saldo ${csvMoney(receipt.remaining)}`,
      receipt.createdAt
    ])
  ];

  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export async function reconcilePaymentMethod(
  data: {
    date: string;
    method: PaymentMethodType;
    expectedAmount: number;
    countedAmount: number;
    notes?: string;
  },
  userId: string
) {
  const divergence = Number((data.countedAmount - data.expectedAmount).toFixed(2));

  return db.auditLog.create({
    data: {
      userId,
      module: "financial",
      action: "payment_method_reconciliation",
      entityType: "payment_reconciliation",
      entityId: `${data.date}:${data.method}`,
      metadata: {
        date: data.date,
        method: data.method,
        methodLabel: paymentMethodLabel(data.method),
        expectedAmount: data.expectedAmount,
        countedAmount: data.countedAmount,
        divergence,
        notes: data.notes?.trim() ?? ""
      }
    }
  });
}

export async function payAccountPayable(
  data: { accountPayableId: string; amount?: number; notes?: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const payable = await tx.accountPayable.findUniqueOrThrow({
      where: {
        id: data.accountPayableId
      }
    });

    if (payable.status !== "PENDING") {
      throw new Error("Apenas contas pendentes podem ser baixadas.");
    }

    const totalAmount = decimalToNumber(payable.amount);
    const alreadyPaid = decimalToNumber(payable.paidAmount);
    const remaining = Number((totalAmount - alreadyPaid).toFixed(2));
    const paymentAmount = Number((data.amount ?? remaining).toFixed(2));

    if (remaining <= 0) {
      throw new Error("Esta conta ja foi baixada.");
    }

    if (paymentAmount > remaining) {
      throw new Error("O valor pago excede o saldo restante da conta.");
    }

    const paidAmount = Number((alreadyPaid + paymentAmount).toFixed(2));
    const fullyPaid = paidAmount >= totalAmount;
    const updated = await tx.accountPayable.update({
      where: {
        id: payable.id
      },
      data: {
        paidAmount,
        status: fullyPaid ? "PAID" : "PENDING"
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "financial",
        action: fullyPaid ? "account_payable_paid" : "account_payable_partial_paid",
        entityType: "account_payable",
        entityId: payable.id,
        metadata: {
          paymentAmount,
          paidAmount,
          totalAmount,
          remaining: Math.max(0, Number((totalAmount - paidAmount).toFixed(2))),
          purchaseOrderId: payable.purchaseOrderId,
          notes: data.notes?.trim() ?? ""
        }
      }
    });

    return updated;
  });
}

export async function receiveAccountReceivable(
  data: { accountReceivableId: string; amount?: number; notes?: string },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const receivable = await tx.accountReceivable.findUniqueOrThrow({
      where: {
        id: data.accountReceivableId
      },
      include: {
        salesOrder: true
      }
    });

    if (receivable.status !== "PENDING") {
      throw new Error("Apenas contas pendentes podem receber baixa.");
    }

    const totalAmount = decimalToNumber(receivable.amount);
    const alreadyReceived = decimalToNumber(receivable.receivedAmount);
    const remaining = Number((totalAmount - alreadyReceived).toFixed(2));
    const receiptAmount = Number((data.amount ?? remaining).toFixed(2));

    if (remaining <= 0) {
      throw new Error("Esta conta ja foi recebida.");
    }

    if (receiptAmount > remaining) {
      throw new Error("O valor recebido excede o saldo restante da conta.");
    }

    const receivedAmount = Number((alreadyReceived + receiptAmount).toFixed(2));
    const fullyReceived = receivedAmount >= totalAmount;
    const updated = await tx.accountReceivable.update({
      where: {
        id: receivable.id
      },
      data: {
        receivedAmount,
        status: fullyReceived ? "PAID" : "PENDING"
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "financial",
        action: fullyReceived ? "account_receivable_received" : "account_receivable_partial_received",
        entityType: "account_receivable",
        entityId: receivable.id,
        metadata: {
          receiptAmount,
          receivedAmount,
          totalAmount,
          remaining: Math.max(0, Number((totalAmount - receivedAmount).toFixed(2))),
          description: receivable.description,
          salesOrderId: receivable.salesOrderId,
          salesOrderNumber: receivable.salesOrder?.number ?? "",
          notes: data.notes?.trim() ?? ""
        }
      }
    });

    return updated;
  });
}
