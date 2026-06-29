import Link from "next/link";
import type { Route } from "next";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

type ReportShortcut = {
  title: string;
  description: string;
  href: Route;
  status: "MVP" | "Parcial" | "Pendente";
  metric: string;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function statusTone(status: ReportShortcut["status"]) {
  if (status === "MVP") {
    return "success";
  }

  if (status === "Parcial") {
    return "warning";
  }

  return "default";
}

export default async function AdminReportsPage() {
  await requirePagePermission("dashboard.view");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    salesOrders,
    ingredients,
    pendingPurchases,
    pendingPayables,
    pendingReceivables,
    losses,
    fiscalDocuments,
    auditLogs
  ] = await Promise.all([
    db.salesOrder.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELED" } },
      select: { status: true, total: true }
    }),
    db.ingredient.findMany({
      select: { currentStock: true, minimumStock: true }
    }),
    db.purchaseOrder.count({
      where: { status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"] } }
    }),
    db.accountPayable.count({ where: { status: "PENDING" } }),
    db.accountReceivable.count({ where: { status: "PENDING" } }),
    db.stockMovement.count({
      where: { createdAt: { gte: since }, type: "LOSS" }
    }),
    db.fiscalDocument.count({ where: { createdAt: { gte: since } } }),
    db.auditLog.count({ where: { createdAt: { gte: since } } })
  ]);

  const salesTotal = salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const paidOrders = salesOrders.filter((order) => order.status === "PAID").length;
  const lowStockItems = ingredients.filter(
    (ingredient) => toNumber(ingredient.minimumStock) > 0 && toNumber(ingredient.currentStock) <= toNumber(ingredient.minimumStock)
  ).length;
  const averageTicket = paidOrders > 0 ? salesTotal / paidOrders : 0;

  const shortcuts: ReportShortcut[] = [
    {
      title: "Vendas",
      description: "Pedidos, ticket medio, comandas quitadas e desempenho do caixa.",
      href: "/operacao/caixa",
      status: "Parcial",
      metric: `${paidOrders} pedido${paidOrders === 1 ? "" : "s"} pago${paidOrders === 1 ? "" : "s"}`
    },
    {
      title: "Estoque",
      description: "Saldos, movimentacoes, estoque minimo, inventario e alertas.",
      href: "/admin/estoque",
      status: "MVP",
      metric: `${lowStockItems} alerta${lowStockItems === 1 ? "" : "s"} de minimo`
    },
    {
      title: "Compras",
      description: "Pedidos em aberto, recebimentos e base para conferencia de notas.",
      href: "/admin/compras",
      status: "Parcial",
      metric: `${pendingPurchases} compra${pendingPurchases === 1 ? "" : "s"} pendente${pendingPurchases === 1 ? "" : "s"}`
    },
    {
      title: "Financeiro",
      description: "Contas a pagar, contas a receber, caixa e conciliacao futura.",
      href: "/admin/financeiro",
      status: "Parcial",
      metric: `${pendingPayables + pendingReceivables} titulo${pendingPayables + pendingReceivables === 1 ? "" : "s"} pendente${pendingPayables + pendingReceivables === 1 ? "" : "s"}`
    },
    {
      title: "Margem e CMV",
      description: "Base preparada para cruzar venda, ficha tecnica e custo de insumos.",
      href: "/admin/fichas-tecnicas",
      status: "Pendente",
      metric: "Aguardando regra completa"
    },
    {
      title: "Desperdicio",
      description: "Perdas registradas, impacto de estoque e pontos de desperdicio.",
      href: "/admin/perdas",
      status: "MVP",
      metric: `${losses} perda${losses === 1 ? "" : "s"} em 30 dias`
    },
    {
      title: "Fiscal",
      description: "Documentos fiscais, contingencia e vinculo com vendas.",
      href: "/admin/fiscal",
      status: "Parcial",
      metric: `${fiscalDocuments} documento${fiscalDocuments === 1 ? "" : "s"} recente${fiscalDocuments === 1 ? "" : "s"}`
    },
    {
      title: "Auditoria",
      description: "Acoes sensiveis, login, cancelamentos e alteracoes importantes.",
      href: "/admin/auditoria",
      status: "MVP",
      metric: `${auditLogs} evento${auditLogs === 1 ? "" : "s"} em 30 dias`
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Vendas 30 dias</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(salesTotal)}</p>
          <p className="mt-1 text-sm text-slate-500">{salesOrders.length} pedidos no periodo</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Ticket medio</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(averageTicket)}</p>
          <p className="mt-1 text-sm text-slate-500">Baseado em pedidos pagos</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Estoque minimo</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{lowStockItems}</p>
          <p className="mt-1 text-sm text-slate-500">Insumos em alerta</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Financeiro</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{pendingPayables + pendingReceivables}</p>
          <p className="mt-1 text-sm text-slate-500">Titulos pendentes</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Central de relatorios</h3>
          <p className="mt-1 text-sm text-slate-500">
            Atalhos para os relatorios contextuais e modulos que alimentam a gestao.
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.title}
              className="flex min-h-[190px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:bg-brand-50"
              href={shortcut.href}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-slate-950">{shortcut.title}</h4>
                  <Badge tone={statusTone(shortcut.status)}>{shortcut.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{shortcut.description}</p>
              </div>
              <p className="mt-5 text-sm font-medium text-brand-800">{shortcut.metric}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
