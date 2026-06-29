import { PaymentMethodType, Prisma, SalesChannel, SalesOrderStatus } from "@prisma/client";
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
