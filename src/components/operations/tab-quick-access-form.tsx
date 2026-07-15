"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

type TabQuickAccessAction = "waiter" | "order" | "scale" | "view" | "cash";

type TabQuickAccessFormProps = {
  defaultTabCode?: string;
  showCash?: boolean;
  showScale?: boolean;
  title?: string;
};

const actions: Array<{
  key: TabQuickAccessAction;
  label: string;
  intent: "primary" | "secondary";
}> = [
  { key: "waiter", label: "Garcom", intent: "primary" },
  { key: "order", label: "Produto", intent: "secondary" },
  { key: "scale", label: "Peso", intent: "secondary" },
  { key: "view", label: "Consultar", intent: "secondary" },
  { key: "cash", label: "Caixa", intent: "secondary" }
];

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function buildHref(action: TabQuickAccessAction, tabCode: string) {
  const encodedTab = encodeURIComponent(tabCode);

  switch (action) {
    case "cash":
      return `/operacao/caixa?comanda=${encodedTab}`;
    case "order":
      return `/operacao/pedidos?comanda=${encodedTab}`;
    case "scale":
      return `/operacao/balanca?comanda=${encodedTab}`;
    case "view":
      return `/operacao/comandas?numero=${encodedTab}`;
    case "waiter":
    default:
      return `/operacao/garcom?comanda=${encodedTab}`;
  }
}

export function TabQuickAccessForm({
  defaultTabCode = "",
  showCash = true,
  showScale = true,
  title = "Acesso rapido por comanda"
}: TabQuickAccessFormProps) {
  const router = useRouter();
  const [tabCode, setTabCode] = useState(onlyNumbers(defaultTabCode));
  const [error, setError] = useState("");

  const visibleActions = useMemo(
    () =>
      actions.filter((action) => {
        if (!showScale && action.key === "scale") {
          return false;
        }

        if (!showCash && action.key === "cash") {
          return false;
        }

        return true;
      }),
    [showCash, showScale]
  );

  function goTo(action: TabQuickAccessAction) {
    const cleanTabCode = onlyNumbers(tabCode);

    if (!cleanTabCode) {
      setError("Digite o numero da comanda.");
      return;
    }

    setError("");
    router.push(buildHref(action, cleanTabCode) as Route);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goTo("waiter");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="min-w-0 flex-1" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="tab-quick-access">
            {title}
          </label>
          <p className="mt-1 text-sm text-slate-500">
            Digite o numero e escolha a acao, sem procurar em listas.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,240px)_auto]">
            <input
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-lg font-semibold tabular-nums text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              id="tab-quick-access"
              inputMode="numeric"
              maxLength={8}
              name="comanda"
              pattern="[0-9]*"
              placeholder="Ex.: 32"
              value={tabCode}
              onChange={(event) => {
                setTabCode(onlyNumbers(event.target.value));
                setError("");
              }}
            />
            <button className="h-12 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700">
              Continuar
            </button>
          </div>
          {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
        </form>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {visibleActions.map((action) => (
            <button
              key={action.key}
              className={
                action.intent === "primary"
                  ? "h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                  : "h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              }
              type="button"
              onClick={() => goTo(action.key)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
