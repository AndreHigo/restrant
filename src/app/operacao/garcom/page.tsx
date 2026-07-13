import Link from "next/link";
import { BanknoteIcon, ClipboardPlusIcon, ReceiptTextIcon, ScaleIcon } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { listOperationDashboard, listOperationalTabs } from "@/lib/services/operations";
import { Badge } from "@/components/ui/badge";
import { OrderCreateForm } from "@/components/operations/order-create-form";
import { OrderItemEditForm } from "@/components/operations/order-item-edit-form";
import { OrderItemTransferForm } from "@/components/operations/order-item-transfer-form";
import { OrderItemWeightAdjustForm } from "@/components/operations/order-item-weight-adjust-form";
import { QuickPosCodeForm } from "@/components/operations/quick-pos-code-form";

type WaiterMobilePageProps = {
  searchParams?: {
    comanda?: string;
  };
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

export default async function WaiterMobilePage({ searchParams }: WaiterMobilePageProps) {
  await requirePagePermission("sales.view");

  const rawTabCode = searchParams?.comanda?.trim() ?? "";
  const tabCode = rawTabCode.replace(/\D/g, "");
  const encodedTab = encodeURIComponent(tabCode);
  const [dashboard, selectedTabDetails, customers, tables, tabs, products, scaleDevices, operationSettings] = await Promise.all([
    listOperationDashboard(),
    tabCode ? listOperationalTabs(tabCode) : Promise.resolve([]),
    db.customer.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 200 }),
    db.restaurantTable.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    db.tab.findMany({ where: { active: true }, orderBy: { openedAt: "desc" }, take: 200 }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.scaleDevice.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getOperationSettings()
  ]);
  const selectedTab = tabCode ? dashboard.tabs.find((tab) => tab.number === tabCode) : null;
  const selectedOperationalTab = selectedTabDetails[0] ?? null;
  const highlightedTabs = dashboard.tabs.slice(0, 8);
  const totalOpen = dashboard.tabs.length;
  const totalPending = dashboard.tabs.reduce((sum, tab) => sum + tab.remaining, 0);
  const orderForm = tabCode ? (
    <OrderCreateForm
      customers={customers.map((item) => ({
        code: item.document ?? undefined,
        keywords: [item.name, item.document, item.phone, item.email].filter(Boolean).join(" "),
        label: item.name,
        meta: item.phone ?? item.email ?? undefined,
        value: item.id
      }))}
      products={products.map((item) => ({
        code: item.sku,
        id: item.id,
        label: `${item.name} - ${Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
        name: item.name,
        price: Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price),
        searchLabel: `${item.sku} ${item.name} ${item.categoryId} ${Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
        typeLabel: item.type === "WEIGHABLE" ? "Venda por quilo" : "Item unitario",
        isWeighable: item.type === "WEIGHABLE"
      }))}
      scaleDevices={scaleDevices.map((item) => ({
        label: item.name,
        value: item.id
      }))}
      tables={tables.map((item) => ({ code: item.code, label: item.name, value: item.id }))}
      tabs={tabs.map((item) => ({ label: item.number, value: item.id, code: item.number }))}
      initialTabCode={tabCode}
      mode="waiter"
      operationSettings={{
        enableCounter: false,
        enableDelivery: false,
        enableTableService: false,
        enableTakeout: false
      }}
    />
  ) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Atendimento</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Garcom</h3>
            <p className="mt-1 text-sm text-slate-500">Digite a comanda para abrir, consultar ou continuar.</p>
          </div>
          <Badge tone="success">{totalOpen} abertas</Badge>
        </div>

        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px]" action="/operacao/garcom">
          <input
            aria-label="Numero da comanda"
            autoFocus
            className="h-16 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-2xl font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
            defaultValue={tabCode}
            inputMode="numeric"
            name="comanda"
            placeholder="Abrir ou consultar"
            pattern="[0-9]*"
            type="search"
          />
          <button className="h-16 rounded-2xl bg-slate-950 px-5 text-base font-semibold text-white transition hover:bg-slate-800">
            Continuar
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Em aberto</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{totalOpen}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Pendente</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totalPending)}</p>
          </div>
        </div>
      </section>

      {tabCode ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{selectedTab ? "Continuando comanda" : "Nova comanda"}</p>
              <h4 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{tabCode}</h4>
            </div>
            <Badge tone={selectedTab && selectedTab.remaining > 0 ? "warning" : "success"}>
              {selectedTab ? `${selectedTab.ordersCount} pedido${selectedTab.ordersCount === 1 ? "" : "s"}` : "Nova"}
            </Badge>
          </div>

          {selectedTab ? (
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Total</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{money(selectedTab.total)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Pago</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{money(selectedTab.paid)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Falta</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{money(selectedTab.remaining)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Comanda livre. O primeiro item lancado cria o pedido automaticamente.
            </p>
          )}

          <div className="mt-5 grid gap-3">
            {selectedOperationalTab?.orders.length ? (
              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">Itens na comanda</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedOperationalTab.orders.flatMap((order) =>
                    order.items.map((item) => (
                      <div key={item.id} className="px-4 py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{item.productName}</p>
                            <p className="mt-1 text-slate-500">
                              {item.weightKg > 0
                                ? `${item.weightKg.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 3,
                                    maximumFractionDigits: 3
                                  })} kg`
                                : `${item.quantity.toLocaleString("pt-BR")} un`}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold text-slate-950">{money(item.totalPrice)}</p>
                        </div>
                        <OrderItemEditForm
                          currentNotes={item.notes}
                          currentQuantity={item.quantity}
                          isWeighable={item.isWeighable}
                          salesOrderItemId={item.id}
                        />
                        {item.isWeighable && (
                          <OrderItemWeightAdjustForm currentWeightKg={item.weightKg} salesOrderItemId={item.id} />
                        )}
                        <OrderItemTransferForm currentTabCode={tabCode} salesOrderItemId={item.id} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Nenhum item lancado ainda. Use o formulario abaixo para abrir ou alimentar a comanda.
              </p>
            )}

            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="mb-4 flex items-center gap-2 text-brand-900">
                <ClipboardPlusIcon className="h-5 w-5" />
                <p className="font-semibold">Lancamento rapido por codigo</p>
              </div>
              <QuickPosCodeForm
                initialTabCode={tabCode}
                products={products.map((item) => ({
                  code: item.sku,
                  id: item.id,
                  isWeighable: item.type === "WEIGHABLE",
                  name: item.name,
                  price: Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price)
                }))}
              />
            </div>

            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900">
                <span>Formulario completo de pedido</span>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Opcional
                </span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                {orderForm}
              </div>
            </details>

            <div className={`grid gap-3 ${operationSettings.enableBuffetKg ? "grid-cols-3" : "grid-cols-2"}`}>
              {operationSettings.enableBuffetKg ? (
                <Link
                  className="inline-flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  href={`/operacao/balanca?comanda=${encodedTab}`}
                >
                  <ScaleIcon className="h-5 w-5 text-slate-500" />
                  Peso
                </Link>
              ) : null}
              <Link
                className="inline-flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href={`/operacao/comandas?numero=${encodedTab}`}
              >
                <ReceiptTextIcon className="h-5 w-5 text-slate-500" />
                Ver
              </Link>
              <Link
                className="inline-flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                href={`/operacao/caixa?comanda=${encodedTab}`}
              >
                <BanknoteIcon className="h-5 w-5" />
                Cobrar
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Comandas abertas</h4>
            <p className="mt-1 text-sm text-slate-500">Toque para continuar o atendimento.</p>
          </div>
          <Badge>{highlightedTabs.length}</Badge>
        </div>
        <div className="divide-y divide-slate-100">
          {highlightedTabs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">Nenhuma comanda aberta no momento.</p>
          ) : (
            highlightedTabs.map((tab) => (
              <Link
                key={tab.id}
                className="flex min-h-20 items-center justify-between gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-5"
                href={`/operacao/garcom?comanda=${encodeURIComponent(tab.number)}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-950">
                    {tab.number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">Comanda {tab.number}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tab.ordersCount} pedido{tab.ordersCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-semibold text-slate-950">{money(tab.remaining)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    pendente
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
