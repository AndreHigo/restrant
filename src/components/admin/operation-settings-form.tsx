"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type OperationSettings = {
  enableBuffetKg: boolean;
  enablePratoFeito: boolean;
  enableKitchen: boolean;
  enableCounter: boolean;
  enableTakeout: boolean;
  enableDelivery: boolean;
  enableTableService: boolean;
  serviceModeNotes: string;
};

type ToggleField = {
  key: keyof Omit<OperationSettings, "serviceModeNotes">;
  title: string;
  description: string;
};

const fields: ToggleField[] = [
  {
    key: "enableBuffetKg",
    title: "Buffet por quilo",
    description: "Habilita pesagem de prato, preco por kg e fluxo de balanca."
  },
  {
    key: "enablePratoFeito",
    title: "Prato feito / refeicao pronta",
    description: "Mantem produtos unitarios como PF, marmita e pratos montados."
  },
  {
    key: "enableKitchen",
    title: "Cozinha e setores de producao",
    description: "Envia itens para cozinha, marmitaria, bebidas ou outros setores."
  },
  {
    key: "enableCounter",
    title: "Balcao / atendimento rapido",
    description: "Libera venda rapida para cliente no balcao."
  },
  {
    key: "enableTakeout",
    title: "Retirada",
    description: "Libera pedidos para retirada no local."
  },
  {
    key: "enableDelivery",
    title: "Delivery",
    description: "Libera canal de entrega e pedidos vinculados a cliente/endereco."
  },
  {
    key: "enableTableService",
    title: "Mesa tradicional",
    description: "Libera atendimento por mesa alem do controle por comanda."
  }
];

export function OperationSettingsForm({ settings }: { settings: OperationSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<OperationSettings>(settings);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toggle(key: ToggleField["key"]) {
    setForm((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.enableBuffetKg && !form.enablePratoFeito && !form.enableCounter && !form.enableDelivery && !form.enableTakeout) {
      setError("Mantenha ao menos um modo de venda habilitado.");
      return;
    }

    const response = await fetch("/api/admin/operation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel salvar a configuracao operacional.");
      return;
    }

    setSuccess("Configuracao operacional atualizada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => {
          const enabled = form[field.key];

          return (
            <button
              key={field.key}
              className={
                enabled
                  ? "rounded-lg border border-brand-200 bg-brand-50 p-4 text-left transition hover:bg-brand-100"
                  : "rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
              }
              type="button"
              onClick={() => toggle(field.key)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{field.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{field.description}</p>
                </div>
                <span
                  className={
                    enabled
                      ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                  }
                >
                  {enabled ? "Ativo" : "Inativo"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Observacoes da operacao
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          maxLength={500}
          placeholder="Ex.: restaurante trabalha apenas com comanda, buffet por quilo no almoco e marmita no balcao."
          value={form.serviceModeNotes}
          onChange={(event) => setForm((current) => ({ ...current, serviceModeNotes: event.target.value }))}
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Button disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Salvar modos de operacao"}
      </Button>
    </form>
  );
}
