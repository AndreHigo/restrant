import Link from "next/link";
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

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Atendimento mobile</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Fluxo do garcom</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Digite a comanda e escolha a acao. O mesmo numero alimenta pedido, balanca, consulta e caixa.
        </p>

        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" action="/operacao/garcom">
          <input
            className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-lg font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            defaultValue={tabCode}
            inputMode="numeric"
            name="comanda"
            placeholder="Numero da comanda"
            type="search"
          />
          <button className="h-14 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Usar comanda
          </button>
        </form>
      </section>

      {tabCode ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Comanda selecionada</p>
              <h4 className="mt-1 text-2xl font-semibold text-slate-950">{tabCode}</h4>
            </div>
            <Badge tone={selectedTab && selectedTab.remaining > 0 ? "warning" : "success"}>
              {selectedTab ? `${selectedTab.ordersCount} pedido${selectedTab.ordersCount === 1 ? "" : "s"}` : "Nova"}
            </Badge>
          </div>

          {selectedTab ? (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
              <p>Total: <span className="font-semibold text-slate-950">{money(selectedTab.total)}</span></p>
              <p>Pago: <span className="font-semibold text-slate-950">{money(selectedTab.paid)}</span></p>
              <p>Pendente: <span className="font-semibold text-slate-950">{money(selectedTab.remaining)}</span></p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Essa comanda ainda nao tem pedido aberto. Ao lancar produto ou peso, ela sera criada automaticamente.
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              className="inline-flex h-14 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
              href={`/operacao/pedidos?comanda=${encodedTab}`}
            >
              Lancar produto
            </Link>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={`/operacao/balanca?comanda=${encodedTab}`}
            >
              Lancar peso
            </Link>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={`/operacao/comandas?numero=${encodedTab}`}
            >
              Ver comanda
            </Link>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={`/operacao/caixa?comanda=${encodedTab}`}
            >
              Cobrar
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h4 className="text-base font-semibold text-slate-950">Comandas abertas</h4>
          <p className="mt-1 text-sm text-slate-500">Acesso rapido as comandas recentes do atendimento.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {highlightedTabs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">Nenhuma comanda aberta no momento.</p>
          ) : (
            highlightedTabs.map((tab) => (
              <Link
                key={tab.id}
                className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50"
                href={`/operacao/garcom?comanda=${encodeURIComponent(tab.number)}`}
              >
                <div>
                  <p className="font-semibold text-slate-950">Comanda {tab.number}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {tab.ordersCount} pedido{tab.ordersCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-950">{money(tab.remaining)}</p>
                  <p className="mt-1 text-slate-500">pendente</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
