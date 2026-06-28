import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReceiptPrintButton } from "@/components/operations/receipt-print-button";
import { paymentMethodLabels, salesChannelLabels, salesStatusLabels } from "@/lib/services/operations";

type ReceiptPageProps = {
  params: {
    id: string;
  };
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function decimal(value: unknown) {
  return Number(value ?? 0);
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  await requirePagePermission("cash.manage");

  const order = await db.salesOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      table: true,
      tab: true,
      items: {
        include: {
          product: true
        },
        orderBy: {
          id: "asc"
        }
      },
      payments: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const paid = order.payments.reduce((sum, payment) => sum + decimal(payment.amount), 0);
  const total = decimal(order.total);
  const remaining = Math.max(0, total - paid);
  const label =
    order.tab?.number ??
    order.table?.name ??
    order.customer?.name ??
    "Atendimento direto";
  const cashHref = order.tab?.number
    ? { pathname: "/operacao/caixa", query: { comanda: order.tab.number } }
    : { pathname: "/operacao/caixa" };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href={cashHref}
        >
          Voltar ao caixa
        </Link>
        <ReceiptPrintButton />
      </div>

      <section className="print-surface rounded-lg border border-slate-200 bg-white p-6">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Restaurant Brasil</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">Recibo do pedido</h3>
              <p className="mt-1 text-sm text-slate-500">
                {order.number} - {salesChannelLabels[order.channel]} - {label}
              </p>
            </div>
            <div className="text-sm text-slate-600 sm:text-right">
              <p>Status: {salesStatusLabels[order.status]}</p>
              <p>Aberto em: {order.openedAt.toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </header>

        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Item</th>
                  <th className="px-3 py-2">Qtd/Peso</th>
                  <th className="px-3 py-2">Unitario</th>
                  <th className="py-2 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{item.product.name}</p>
                      {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {item.weightKg
                        ? `${decimal(item.weightKg).toLocaleString("pt-BR", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3
                          })} kg`
                        : `${decimal(item.quantity).toLocaleString("pt-BR")} un`}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{money(decimal(item.unitPrice))}</td>
                    <td className="py-3 pl-3 text-right font-medium text-slate-950">
                      {money(decimal(item.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-sm space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">{money(decimal(order.subtotal))}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Desconto</span>
              <span className="font-medium text-slate-900">{money(decimal(order.discount))}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Taxa/acrescimo</span>
              <span className="font-medium text-slate-900">{money(decimal(order.serviceCharge))}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-semibold text-slate-950">{money(total)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Pago</span>
              <span className="font-medium text-slate-900">{money(paid)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Restante</span>
              <span className="font-medium text-slate-900">{money(remaining)}</span>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Pagamentos</p>
              <div className="space-y-2">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between gap-3 text-sm text-slate-700">
                    <span>{paymentMethodLabels[payment.method]}</span>
                    <span className="font-medium text-slate-950">{money(decimal(payment.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            Documento nao fiscal. Emissao fiscal sera feita no modulo NFC-e/NF-e quando habilitado.
          </footer>
        </div>
      </section>
    </div>
  );
}
