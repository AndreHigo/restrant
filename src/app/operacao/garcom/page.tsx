import Link from "next/link";
import { BanknoteIcon, ClipboardPlusIcon, ReceiptTextIcon, ScaleIcon } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { listOperationDashboard } from "@/lib/services/operations";
import { Badge } from "@/components/ui/badge";

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

  const dashboard = await listOperationDashboard();
  const tabCode = searchParams?.comanda?.trim() ?? "";
  const encodedTab = encodeURIComponent(tabCode);
  const selectedTab = tabCode ? dashboard.tabs.find((tab) => tab.number === tabCode) : null;
  const highlightedTabs = dashboard.tabs.slice(0, 8);
  const totalOpen = dashboard.tabs.length;
  const totalPending = dashboard.tabs.reduce((sum, tab) => sum + tab.remaining, 0);

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
            <Link
              className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-brand-600 px-5 text-lg font-semibold text-white transition hover:bg-brand-700"
              href={`/operacao/pedidos?comanda=${encodedTab}&origem=garcom`}
            >
              <ClipboardPlusIcon className="h-6 w-6" />
              Adicionar item
            </Link>

            <div className="grid grid-cols-3 gap-3">
              <Link
                className="inline-flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href={`/operacao/balanca?comanda=${encodedTab}`}
              >
                <ScaleIcon className="h-5 w-5 text-slate-500" />
                Peso
              </Link>
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
