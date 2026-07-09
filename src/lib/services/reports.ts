import {
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  PurchaseOrderStatus,
  SalesChannel,
  SalesOrderStatus,
  StockMovementType
} from "@prisma/client";
import { db } from "@/lib/db";
import { paymentMethodLabels, salesChannelLabels, salesStatusLabels } from "@/lib/services/operations";

export type SalesReportFilters = {
  channel?: string;
  end?: string;
  start?: string;
  status?: string;
};

export type SalesReportRow = {
  channel: SalesChannel;
  channelLabel: string;
  label: string;
  number: string;
  openedAt: string;
  paid: number;
  paymentMethods: string;
  remaining: number;
  status: SalesOrderStatus;
  statusLabel: string;
  total: number;
};

export type SalesReportResult = {
  averageTicket: number;
  canceledTotal: number;
  endDate: string;
  filters: Required<SalesReportFilters>;
  paidOrders: number;
  paidTotal: number;
  rows: SalesReportRow[];
  startDate: string;
  totalOrders: number;
  totalRevenue: number;
};

const defaultStatus = "ALL";
const defaultChannel = "ALL";
const defaultStockStatus = "ALL";
const defaultSupplier = "ALL";
const defaultFinancialType = "ALL";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value) {
    return fallback;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return fallback;
  }

  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function normalizeStatus(value?: string) {
  if (value && value in SalesOrderStatus) {
    return value as SalesOrderStatus;
  }

  return defaultStatus;
}

function normalizeChannel(value?: string) {
  if (value && value in SalesChannel) {
    return value as SalesChannel;
  }

  return defaultChannel;
}

function orderLabel(order: {
  channel: SalesChannel;
  table: { code: string; name: string } | null;
  tab: { number: string } | null;
}) {
  if (order.channel === "TAB") {
    return order.tab?.number ? `Comanda ${order.tab.number}` : "Comanda";
  }

  if (order.channel === "TABLE") {
    return order.table ? `${order.table.code} - ${order.table.name}` : "Mesa";
  }

  return salesChannelLabels[order.channel];
}

export async function getSalesReport(filters: SalesReportFilters = {}): Promise<SalesReportResult> {
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30);

  const start = parseDateInput(filters.start, defaultStart);
  const end = parseDateInput(filters.end, now, true);
  const status = normalizeStatus(filters.status);
  const channel = normalizeChannel(filters.channel);

  const where: Prisma.SalesOrderWhereInput = {
    openedAt: {
      gte: start,
      lte: end
    }
  };

  if (status !== defaultStatus) {
    where.status = status;
  }

  if (channel !== defaultChannel) {
    where.channel = channel;
  }

  const orders = await db.salesOrder.findMany({
    where,
    include: {
      payments: true,
      table: true,
      tab: true
    },
    orderBy: { openedAt: "desc" },
    take: 300
  });

  const rows = orders.map((order) => {
    const paid = roundMoney(
      order.payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0)
    );
    const total = toNumber(order.total);
    const methods = Array.from(
      new Set(
        order.payments
          .filter((payment) => payment.status === "PAID")
          .map((payment) => paymentMethodLabels[payment.method as PaymentMethodType])
      )
    );

    return {
      channel: order.channel,
      channelLabel: salesChannelLabels[order.channel],
      label: orderLabel(order),
      number: order.number,
      openedAt: order.openedAt.toISOString(),
      paid,
      paymentMethods: methods.join(", ") || "-",
      remaining: Math.max(0, roundMoney(total - paid)),
      status: order.status,
      statusLabel: salesStatusLabels[order.status],
      total
    };
  });

  const totalRevenue = roundMoney(rows.filter((row) => row.status !== "CANCELED").reduce((sum, row) => sum + row.total, 0));
  const paidRows = rows.filter((row) => row.status === "PAID");
  const paidTotal = roundMoney(paidRows.reduce((sum, row) => sum + row.paid, 0));
  const canceledTotal = roundMoney(rows.filter((row) => row.status === "CANCELED").reduce((sum, row) => sum + row.total, 0));

  return {
    averageTicket: paidRows.length > 0 ? roundMoney(paidTotal / paidRows.length) : 0,
    canceledTotal,
    endDate: toDateInputValue(end),
    filters: {
      channel: channel,
      end: toDateInputValue(end),
      start: toDateInputValue(start),
      status: status
    },
    paidOrders: paidRows.length,
    paidTotal,
    rows,
    startDate: toDateInputValue(start),
    totalOrders: rows.length,
    totalRevenue
  };
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function salesReportToCsv(report: SalesReportResult) {
  const header = [
    "Pedido",
    "Abertura",
    "Canal",
    "Origem",
    "Status",
    "Total",
    "Pago",
    "Restante",
    "Formas de pagamento"
  ];

  const rows = report.rows.map((row) => [
    row.number,
    new Date(row.openedAt).toLocaleString("pt-BR"),
    row.channelLabel,
    row.label,
    row.statusLabel,
    row.total.toFixed(2),
    row.paid.toFixed(2),
    row.remaining.toFixed(2),
    row.paymentMethods
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export type StockReportFilters = {
  query?: string;
  status?: string;
};

export type StockReportRow = {
  cost: number;
  currentStock: number;
  expiresAt: string | null;
  id: string;
  minimumStock: number;
  name: string;
  recentIn: number;
  recentLoss: number;
  recentOut: number;
  sku: string;
  status: "OK" | "LOW" | "EXPIRED" | "EXPIRING";
  statusLabel: string;
  unit: string;
  value: number;
};

export type StockReportResult = {
  expiringItems: number;
  expiredItems: number;
  filters: Required<StockReportFilters>;
  inventoryValue: number;
  lowStockItems: number;
  rows: StockReportRow[];
  totalItems: number;
};

const stockStatusLabels: Record<StockReportRow["status"], string> = {
  EXPIRED: "Vencido",
  EXPIRING: "Vence em breve",
  LOW: "Estoque minimo",
  OK: "Regular"
};

const stockInTypes: StockMovementType[] = ["IN", "PURCHASE", "INVENTORY"];
const stockOutTypes: StockMovementType[] = ["OUT", "SALE"];

function normalizeStockStatus(value?: string) {
  if (value === "LOW" || value === "OK" || value === "EXPIRED" || value === "EXPIRING") {
    return value;
  }

  return defaultStockStatus;
}

function stockStatus(currentStock: number, minimumStock: number, expiresAt: Date | null): StockReportRow["status"] {
  const now = new Date();
  const expiringLimit = new Date();
  expiringLimit.setDate(now.getDate() + 7);

  if (expiresAt && expiresAt < now) {
    return "EXPIRED";
  }

  if (expiresAt && expiresAt <= expiringLimit) {
    return "EXPIRING";
  }

  if (minimumStock > 0 && currentStock <= minimumStock) {
    return "LOW";
  }

  return "OK";
}

export async function getStockReport(filters: StockReportFilters = {}): Promise<StockReportResult> {
  const status = normalizeStockStatus(filters.status);
  const query = filters.query?.trim() ?? "";
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const ingredients = await db.ingredient.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: {
      stockMovements: {
        where: { createdAt: { gte: since } },
        select: { quantity: true, type: true }
      }
    },
    orderBy: { name: "asc" },
    take: 300
  });

  const rows = ingredients
    .map((ingredient) => {
      const currentStock = toNumber(ingredient.currentStock);
      const minimumStock = toNumber(ingredient.minimumStock);
      const cost = toNumber(ingredient.cost);
      const rowStatus = stockStatus(currentStock, minimumStock, ingredient.expiresAt);
      const recentIn = ingredient.stockMovements
        .filter((movement) => stockInTypes.includes(movement.type))
        .reduce((sum, movement) => sum + toNumber(movement.quantity), 0);
      const recentOut = ingredient.stockMovements
        .filter((movement) => stockOutTypes.includes(movement.type))
        .reduce((sum, movement) => sum + toNumber(movement.quantity), 0);
      const recentLoss = ingredient.stockMovements
        .filter((movement) => movement.type === "LOSS")
        .reduce((sum, movement) => sum + toNumber(movement.quantity), 0);

      return {
        cost,
        currentStock,
        expiresAt: ingredient.expiresAt?.toISOString() ?? null,
        id: ingredient.id,
        minimumStock,
        name: ingredient.name,
        recentIn: Number(recentIn.toFixed(3)),
        recentLoss: Number(recentLoss.toFixed(3)),
        recentOut: Number(recentOut.toFixed(3)),
        sku: ingredient.sku,
        status: rowStatus,
        statusLabel: stockStatusLabels[rowStatus],
        unit: ingredient.unit,
        value: roundMoney(currentStock * cost)
      };
    })
    .filter((row) => status === defaultStockStatus || row.status === status);

  return {
    expiringItems: rows.filter((row) => row.status === "EXPIRING").length,
    expiredItems: rows.filter((row) => row.status === "EXPIRED").length,
    filters: {
      query,
      status
    },
    inventoryValue: roundMoney(rows.reduce((sum, row) => sum + row.value, 0)),
    lowStockItems: rows.filter((row) => row.status === "LOW").length,
    rows,
    totalItems: rows.length
  };
}

export function stockReportToCsv(report: StockReportResult) {
  const header = [
    "Codigo",
    "Insumo",
    "Unidade",
    "Status",
    "Saldo atual",
    "Estoque minimo",
    "Custo",
    "Valor em estoque",
    "Entradas 30 dias",
    "Saidas 30 dias",
    "Perdas 30 dias",
    "Validade"
  ];

  const rows = report.rows.map((row) => [
    row.sku,
    row.name,
    row.unit,
    row.statusLabel,
    row.currentStock.toFixed(3),
    row.minimumStock.toFixed(3),
    row.cost.toFixed(2),
    row.value.toFixed(2),
    row.recentIn.toFixed(3),
    row.recentOut.toFixed(3),
    row.recentLoss.toFixed(3),
    row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("pt-BR") : ""
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export const purchaseStatusLabels: Record<PurchaseOrderStatus, string> = {
  APPROVED: "Aprovado",
  CANCELED: "Cancelado",
  DRAFT: "Rascunho",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recebido",
  SUBMITTED: "Enviado"
};

export type PurchaseReportFilters = {
  status?: string;
  supplierId?: string;
};

export type PurchaseReportRow = {
  expectedAt: string | null;
  id: string;
  itemSummary: string;
  number: string;
  pendingQty: number;
  receivedAt: string | null;
  receivedQty: number;
  status: PurchaseOrderStatus;
  statusLabel: string;
  supplierName: string;
  totalAmount: number;
};

export type PurchaseReportResult = {
  canceledAmount: number;
  filters: Required<PurchaseReportFilters>;
  openOrders: number;
  pendingAmount: number;
  receivedAmount: number;
  rows: PurchaseReportRow[];
  totalAmount: number;
  totalOrders: number;
};

function normalizePurchaseStatus(value?: string) {
  if (value && value in PurchaseOrderStatus) {
    return value as PurchaseOrderStatus;
  }

  return defaultStatus;
}

export async function getPurchaseReport(filters: PurchaseReportFilters = {}): Promise<PurchaseReportResult> {
  const status = normalizePurchaseStatus(filters.status);
  const supplierId = filters.supplierId?.trim() || defaultSupplier;
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (status !== defaultStatus) {
    where.status = status;
  }

  if (supplierId !== defaultSupplier) {
    where.supplierId = supplierId;
  }

  const orders = await db.purchaseOrder.findMany({
    where,
    include: {
      items: {
        include: {
          ingredient: true,
          product: true
        },
        orderBy: { id: "asc" }
      },
      supplier: true
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  const rows = orders.map((order) => {
    const receivedQty = order.items.reduce((sum, item) => sum + toNumber(item.receivedQty), 0);
    const quantity = order.items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const pendingQty = Number(Math.max(quantity - receivedQty, 0).toFixed(3));
    const itemSummary = order.items
      .map((item) => {
        const name = item.ingredient?.name ?? item.product?.name ?? "Item sem cadastro";
        return `${name} (${toNumber(item.quantity).toLocaleString("pt-BR")})`;
      })
      .join(", ");

    return {
      expectedAt: order.expectedAt?.toISOString() ?? null,
      id: order.id,
      itemSummary: itemSummary || "-",
      number: order.number,
      pendingQty,
      receivedAt: order.receivedAt?.toISOString() ?? null,
      receivedQty: Number(receivedQty.toFixed(3)),
      status: order.status,
      statusLabel: purchaseStatusLabels[order.status],
      supplierName: order.supplier.tradeName || order.supplier.corporateName,
      totalAmount: toNumber(order.totalAmount)
    };
  });

  const openRows = rows.filter((row) => row.status !== "RECEIVED" && row.status !== "CANCELED");
  const receivedRows = rows.filter((row) => row.status === "RECEIVED");
  const canceledRows = rows.filter((row) => row.status === "CANCELED");

  return {
    canceledAmount: roundMoney(canceledRows.reduce((sum, row) => sum + row.totalAmount, 0)),
    filters: {
      status,
      supplierId
    },
    openOrders: openRows.length,
    pendingAmount: roundMoney(openRows.reduce((sum, row) => sum + row.totalAmount, 0)),
    receivedAmount: roundMoney(receivedRows.reduce((sum, row) => sum + row.totalAmount, 0)),
    rows,
    totalAmount: roundMoney(rows.reduce((sum, row) => sum + row.totalAmount, 0)),
    totalOrders: rows.length
  };
}

export function purchaseReportToCsv(report: PurchaseReportResult) {
  const header = [
    "Pedido",
    "Fornecedor",
    "Status",
    "Itens",
    "Total",
    "Quantidade recebida",
    "Quantidade pendente",
    "Previsao",
    "Recebimento"
  ];

  const rows = report.rows.map((row) => [
    row.number,
    row.supplierName,
    row.statusLabel,
    row.itemSummary,
    row.totalAmount.toFixed(2),
    row.receivedQty.toFixed(3),
    row.pendingQty.toFixed(3),
    row.expectedAt ? new Date(row.expectedAt).toLocaleDateString("pt-BR") : "",
    row.receivedAt ? new Date(row.receivedAt).toLocaleDateString("pt-BR") : ""
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  CANCELED: "Cancelado",
  PAID: "Pago",
  PENDING: "Pendente",
  REFUNDED: "Estornado"
};

export type FinancialReportFilters = {
  status?: string;
  type?: string;
};

export type FinancialReportRow = {
  amount: number;
  counterparty: string;
  description: string;
  dueDate: string;
  id: string;
  paidAmount: number;
  reference: string;
  remaining: number;
  status: PaymentStatus;
  statusLabel: string;
  type: "PAYABLE" | "RECEIVABLE";
  typeLabel: string;
};

export type FinancialReportResult = {
  filters: Required<FinancialReportFilters>;
  overdueCount: number;
  paidPayables: number;
  pendingPayables: number;
  pendingReceivables: number;
  receivedAmount: number;
  rows: FinancialReportRow[];
  totalPending: number;
};

function normalizePaymentStatus(value?: string) {
  if (value && value in PaymentStatus) {
    return value as PaymentStatus;
  }

  return defaultStatus;
}

function normalizeFinancialType(value?: string) {
  if (value === "PAYABLE" || value === "RECEIVABLE") {
    return value;
  }

  return defaultFinancialType;
}

export async function getFinancialReport(filters: FinancialReportFilters = {}): Promise<FinancialReportResult> {
  const status = normalizePaymentStatus(filters.status);
  const type = normalizeFinancialType(filters.type);
  const payableWhere: Prisma.AccountPayableWhereInput = {};
  const receivableWhere: Prisma.AccountReceivableWhereInput = {};

  if (status !== defaultStatus) {
    payableWhere.status = status;
    receivableWhere.status = status;
  }

  const [payables, receivables] = await Promise.all([
    type === "RECEIVABLE"
      ? Promise.resolve([])
      : db.accountPayable.findMany({
          where: payableWhere,
          include: {
            purchaseOrder: true,
            supplier: true
          },
          orderBy: { dueDate: "asc" },
          take: 300
        }),
    type === "PAYABLE"
      ? Promise.resolve([])
      : db.accountReceivable.findMany({
          where: receivableWhere,
          include: {
            customer: true,
            salesOrder: true
          },
          orderBy: { dueDate: "asc" },
          take: 300
        })
  ]);

  const payableRows: FinancialReportRow[] = payables.map((item) => {
    const amount = toNumber(item.amount);
    const paidAmount = toNumber(item.paidAmount);

    return {
      amount,
      counterparty: item.supplier?.tradeName || item.supplier?.corporateName || "Sem fornecedor",
      description: item.description,
      dueDate: item.dueDate.toISOString(),
      id: item.id,
      paidAmount,
      reference: item.purchaseOrder?.number ?? "-",
      remaining: Math.max(0, roundMoney(amount - paidAmount)),
      status: item.status,
      statusLabel: paymentStatusLabels[item.status],
      type: "PAYABLE",
      typeLabel: "A pagar"
    };
  });

  const receivableRows: FinancialReportRow[] = receivables.map((item) => {
    const amount = toNumber(item.amount);
    const paidAmount = toNumber(item.receivedAmount);

    return {
      amount,
      counterparty: item.customer?.name ?? (item.salesOrder?.tabId ? "Comanda" : "Consumidor final"),
      description: item.description,
      dueDate: item.dueDate.toISOString(),
      id: item.id,
      paidAmount,
      reference: item.salesOrder?.number ?? "-",
      remaining: Math.max(0, roundMoney(amount - paidAmount)),
      status: item.status,
      statusLabel: paymentStatusLabels[item.status],
      type: "RECEIVABLE",
      typeLabel: "A receber"
    };
  });

  const rows = [...payableRows, ...receivableRows].sort(
    (first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime()
  );
  const now = new Date();

  return {
    filters: {
      status,
      type
    },
    overdueCount: rows.filter((row) => row.status === "PENDING" && new Date(row.dueDate) < now).length,
    paidPayables: roundMoney(payableRows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.paidAmount, 0)),
    pendingPayables: roundMoney(payableRows.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + row.remaining, 0)),
    pendingReceivables: roundMoney(
      receivableRows.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + row.remaining, 0)
    ),
    receivedAmount: roundMoney(
      receivableRows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.paidAmount, 0)
    ),
    rows,
    totalPending: roundMoney(rows.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + row.remaining, 0))
  };
}

export function financialReportToCsv(report: FinancialReportResult) {
  const header = [
    "Tipo",
    "Descricao",
    "Parte",
    "Referencia",
    "Vencimento",
    "Status",
    "Valor",
    "Pago/recebido",
    "Restante"
  ];

  const rows = report.rows.map((row) => [
    row.typeLabel,
    row.description,
    row.counterparty,
    row.reference,
    new Date(row.dueDate).toLocaleDateString("pt-BR"),
    row.statusLabel,
    row.amount.toFixed(2),
    row.paidAmount.toFixed(2),
    row.remaining.toFixed(2)
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export type MarginReportFilters = {
  end?: string;
  start?: string;
};

export type MarginReportRow = {
  cmvPercent: number;
  cost: number;
  grossMargin: number;
  grossMarginPercent: number;
  productName: string;
  quantity: number;
  revenue: number;
  sku: string;
};

export type MarginLossReportRow = {
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  value: number;
};

export type MarginReportResult = {
  averageCmvPercent: number;
  filters: Required<MarginReportFilters>;
  lossRows: MarginLossReportRow[];
  lossValue: number;
  netMarginAfterLosses: number;
  rows: MarginReportRow[];
  totalCost: number;
  totalGrossMargin: number;
  totalRevenue: number;
};

function productUnitCost(product: {
  cost: Prisma.Decimal;
  recipeItems: Array<{ ingredient: { cost: Prisma.Decimal }; quantity: Prisma.Decimal }>;
}) {
  if (product.recipeItems.length === 0) {
    return toNumber(product.cost);
  }

  return product.recipeItems.reduce(
    (sum, item) => sum + toNumber(item.quantity) * toNumber(item.ingredient.cost),
    0
  );
}

export async function getMarginReport(filters: MarginReportFilters = {}): Promise<MarginReportResult> {
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30);

  const start = parseDateInput(filters.start, defaultStart);
  const end = parseDateInput(filters.end, now, true);

  const [items, losses] = await Promise.all([
    db.salesOrderItem.findMany({
      where: {
        salesOrder: {
          closedAt: {
            gte: start,
            lte: end
          },
          status: "PAID"
        }
      },
      include: {
        product: {
          include: {
            recipeItems: {
              include: {
                ingredient: true
              }
            }
          }
        }
      },
      take: 1000
    }),
    db.stockMovement.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        type: "LOSS"
      },
      include: {
        ingredient: true
      },
      take: 1000
    })
  ]);

  const products = new Map<string, MarginReportRow>();

  for (const item of items) {
    const product = item.product;
    const quantity = toNumber(item.quantity);
    const revenue = toNumber(item.totalPrice);
    const unitCost = productUnitCost(product);
    const cost = roundMoney(unitCost * quantity);
    const current = products.get(product.id) ?? {
      cmvPercent: 0,
      cost: 0,
      grossMargin: 0,
      grossMarginPercent: 0,
      productName: product.name,
      quantity: 0,
      revenue: 0,
      sku: product.sku
    };

    current.quantity = Number((current.quantity + quantity).toFixed(3));
    current.revenue = roundMoney(current.revenue + revenue);
    current.cost = roundMoney(current.cost + cost);
    current.grossMargin = roundMoney(current.revenue - current.cost);
    current.cmvPercent = current.revenue > 0 ? Number(((current.cost / current.revenue) * 100).toFixed(1)) : 0;
    current.grossMarginPercent =
      current.revenue > 0 ? Number(((current.grossMargin / current.revenue) * 100).toFixed(1)) : 0;
    products.set(product.id, current);
  }

  const rows = Array.from(products.values()).sort((first, second) => second.revenue - first.revenue);
  const lossRows = Array.from(
    losses.reduce<Map<string, MarginLossReportRow>>((map, loss) => {
      const quantity = toNumber(loss.quantity);
      const unitCost = toNumber(loss.unitCost ?? loss.ingredient.cost);
      const value = roundMoney(quantity * unitCost);
      const current = map.get(loss.ingredientId) ?? {
        ingredientName: loss.ingredient.name,
        quantity: 0,
        unit: loss.ingredient.unit,
        unitCost,
        value: 0
      };

      current.quantity = Number((current.quantity + quantity).toFixed(3));
      current.value = roundMoney(current.value + value);
      map.set(loss.ingredientId, current);
      return map;
    }, new Map()).values()
  ).sort((first, second) => second.value - first.value);
  const totalRevenue = roundMoney(rows.reduce((sum, row) => sum + row.revenue, 0));
  const totalCost = roundMoney(rows.reduce((sum, row) => sum + row.cost, 0));
  const totalGrossMargin = roundMoney(totalRevenue - totalCost);
  const lossValue = roundMoney(lossRows.reduce((sum, loss) => sum + loss.value, 0));

  return {
    averageCmvPercent: totalRevenue > 0 ? Number(((totalCost / totalRevenue) * 100).toFixed(1)) : 0,
    filters: {
      end: toDateInputValue(end),
      start: toDateInputValue(start)
    },
    lossRows,
    lossValue,
    netMarginAfterLosses: roundMoney(totalGrossMargin - lossValue),
    rows,
    totalCost,
    totalGrossMargin,
    totalRevenue
  };
}

export function marginReportToCsv(report: MarginReportResult) {
  const header = [
    "Codigo",
    "Produto",
    "Quantidade",
    "Receita",
    "CMV",
    "CMV %",
    "Margem bruta",
    "Margem %"
  ];

  const rows = report.rows.map((row) => [
    row.sku,
    row.productName,
    row.quantity.toFixed(3),
    row.revenue.toFixed(2),
    row.cost.toFixed(2),
    row.cmvPercent.toFixed(1),
    row.grossMargin.toFixed(2),
    row.grossMarginPercent.toFixed(1)
  ]);
  const lossRows = report.lossRows.map((row) => [
    "PERDA",
    row.ingredientName,
    row.quantity.toFixed(3),
    "",
    row.value.toFixed(2),
    "",
    "",
    ""
  ]);

  return [header, ...rows, ...lossRows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}
