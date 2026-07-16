import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReceiptNfceButton } from "@/components/operations/receipt-nfce-button";
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
  const session = await requirePagePermission("cash.manage");

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
      },
      fiscalDocuments: {
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          number: true,
          series: true,
          status: true,
          type: true
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });
  const paid = order.payments.reduce((sum, payment) => sum + decimal(payment.amount), 0);
  const total = decimal(order.total);
  const remaining = Math.max(0, total - paid);
  const itemsDiscount = order.items.reduce((sum, item) => sum + decimal(item.discount), 0);
  const grossItemsTotal = order.items.reduce(
    (sum, item) => sum + decimal(item.totalPrice) + decimal(item.discount),
    0
  );
  const issuedAt = new Date();
  const label =
    order.tab?.number ??
    order.table?.name ??
    order.customer?.name ??
    "Atendimento direto";
  const cashHref = order.tab?.number
    ? { pathname: "/operacao/caixa", query: { comanda: order.tab.number } }
    : { pathname: "/operacao/caixa" };
  const fiscalDocument = order.fiscalDocuments[0];
  const canPrepareFiscalDocument = session.permissions.includes("fiscal.manage");

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

      <div className="no-print grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        {fiscalDocument ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">
              {fiscalDocument.type === "NFCe" ? "Cupom fiscal vinculado" : "Nota fiscal vinculada"}
            </p>
            <p className="mt-1">
              {fiscalDocument.type} {fiscalDocument.series}/{fiscalDocument.number || "sem numero"} - {fiscalDocument.status}
            </p>
            <Link className="mt-2 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800" href="/admin/fiscal">
              Ver no fiscal
            </Link>
          </div>
        ) : order.status === "PAID" && canPrepareFiscalDocument ? (
          <ReceiptNfceButton salesOrderId={order.id} />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">Cupom nao fiscal</p>
            <p className="mt-1">
              Este comprovante pode ser impresso agora. O cupom fiscal NFC-e pode ser gerado por um usuario com permissao fiscal.
            </p>
          </div>
        )}
      </div>

      <section className="print-surface mx-auto max-w-[420px] rounded-lg border border-slate-200 bg-white p-5 font-mono text-sm text-slate-950 shadow-sm">
        <header className="space-y-2 border-b border-dashed border-slate-300 pb-4 text-center">
          <p className="text-base font-bold uppercase">{company?.tradeName || company?.legalName || "Restaurant Brasil"}</p>
          {company?.legalName && company.tradeName !== company.legalName && (
            <p className="text-xs uppercase text-slate-600">{company.legalName}</p>
          )}
          {company?.document && <p className="text-xs text-slate-600">CNPJ/CPF: {company.document}</p>}
          {(company?.addressLine || company?.city || company?.state) && (
            <p className="text-xs leading-5 text-slate-600">
              {[company.addressLine, company.city, company.state].filter(Boolean).join(" - ")}
            </p>
          )}
          <div className="pt-2">
            <p className="text-sm font-bold uppercase">Recibo de consumo</p>
            <p className="text-xs text-slate-600">Documento nao fiscal</p>
          </div>
        </header>

        <div className="space-y-4 py-4">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-3">
              <span>Pedido</span>
              <span className="font-semibold">{order.number}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>{salesChannelLabels[order.channel]}</span>
              <span className="font-semibold">{label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Status</span>
              <span>{salesStatusLabels[order.status]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Aberto</span>
              <span>{order.openedAt.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Emitido</span>
              <span>{issuedAt.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <div className="border-y border-dashed border-slate-300 py-3">
            <div className="grid grid-cols-[1fr_70px_82px] gap-2 text-[11px] font-bold uppercase text-slate-500">
              <span>Item</span>
              <span className="text-right">Qtd</span>
              <span className="text-right">Total</span>
            </div>
            <div className="mt-2 space-y-3">
              {order.items.map((item) => {
                const itemDiscount = decimal(item.discount);
                const itemTotal = decimal(item.totalPrice);
                const quantityLabel = item.weightKg
                  ? `${decimal(item.weightKg).toLocaleString("pt-BR", {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3
                    })}kg`
                  : `${decimal(item.quantity).toLocaleString("pt-BR")}un`;

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="grid grid-cols-[1fr_70px_82px] gap-2">
                      <span className="min-w-0 font-semibold">
                        {item.product.sku ? `${item.product.sku} ` : ""}
                        {item.product.name}
                      </span>
                      <span className="text-right">{quantityLabel}</span>
                      <span className="text-right font-semibold">{money(itemTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs text-slate-600">
                      <span>{money(decimal(item.unitPrice))} cada</span>
                      {itemDiscount > 0 && <span>Desc. item {money(itemDiscount)}</span>}
                    </div>
                    {item.notes && <p className="text-xs text-slate-500">Obs.: {item.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span>Total bruto dos itens</span>
              <span className="font-medium">{money(grossItemsTotal)}</span>
            </div>
            {itemsDiscount > 0 && (
              <div className="flex justify-between gap-3">
                <span>Descontos nos itens</span>
                <span className="font-medium">-{money(itemsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>
              <span className="font-medium">{money(decimal(order.subtotal))}</span>
            </div>
            {decimal(order.discount) > 0 && (
              <div className="flex justify-between gap-3">
                <span>Desconto geral</span>
                <span className="font-medium">-{money(decimal(order.discount))}</span>
              </div>
            )}
            {decimal(order.serviceCharge) > 0 && (
              <div className="flex justify-between gap-3">
                <span>Taxa/acrescimo</span>
                <span className="font-medium">{money(decimal(order.serviceCharge))}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 border-y border-dashed border-slate-300 py-3 text-base">
              <span className="font-bold">Total</span>
              <span className="font-bold">{money(total)}</span>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="border-b border-dashed border-slate-300 pb-3">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">Pagamentos</p>
              <div className="space-y-2">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between gap-3 text-sm">
                    <span>{paymentMethodLabels[payment.method]}</span>
                    <span className="font-medium">{money(decimal(payment.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span>Pago</span>
              <span className="font-medium">{money(paid)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Restante</span>
              <span className="font-medium">{money(remaining)}</span>
            </div>
          </div>

          <footer className="space-y-2 border-t border-dashed border-slate-300 pt-4 text-center text-xs text-slate-500">
            <p>Obrigado pela preferencia.</p>
            <p>Documento sem valor fiscal.</p>
          </footer>
        </div>
      </section>
    </div>
  );
}
