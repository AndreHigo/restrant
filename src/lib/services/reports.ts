import { PaymentMethodType, Prisma, SalesChannel, SalesOrderStatus, StockMovementType } from "@prisma/client";
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
    "SKU",
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
