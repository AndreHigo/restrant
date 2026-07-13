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
  allowManualWeightInput: boolean;
  requireWeightChangeReason: boolean;
  requireCancelReason: boolean;
  requireCancelApproval: boolean;
  allowPartialPayments: boolean;
  requireOpenCashRegister: boolean;
  serviceChargePercent: number;
  enableAutoStockDeduction: boolean;
  blockOutOfStockSales: boolean;
  serviceModeNotes: string;
};

type ToggleField = {
  key: keyof Omit<OperationSettings, "serviceModeNotes" | "serviceChargePercent">;
  title: string;
  description: string;
};

const fieldSections: Array<{ title: string; description: string; fields: ToggleField[] }> = [
  {
    title: "Fluxos de venda",
    description: "Define quais canais aparecem para a operacao.",
    fields: [
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
    ]
  },
  {
    title: "Balanca",
    description: "Controla excecoes quando a leitura fisica nao estiver disponivel.",
    fields: [
      {
        key: "allowManualWeightInput",
        title: "Permitir peso manual",
        description: "Autoriza informar peso digitado quando a balanca falhar ou estiver em contingencia."
      },
      {
        key: "requireWeightChangeReason",
        title: "Exigir motivo ao alterar peso",
        description: "Mantem auditoria obrigatoria em ajustes de peso ja lancado."
      }
    ]
  },
  {
    title: "Caixa e pagamentos",
    description: "Regras que reduzem erro no fechamento financeiro.",
    fields: [
      {
        key: "requireOpenCashRegister",
        title: "Exigir caixa aberto",
        description: "Bloqueia pagamentos e estornos quando nao houver caixa aberto."
      },
      {
        key: "allowPartialPayments",
        title: "Permitir pagamento parcial",
        description: "Permite pagar parte da comanda e deixar saldo pendente."
      }
    ]
  },
  {
    title: "Estoque e auditoria",
    description: "Protecoes para custo, baixa automatica e rastreabilidade.",
    fields: [
      {
        key: "enableAutoStockDeduction",
        title: "Baixa automatica de estoque",
        description: "Ao quitar a venda, baixa produtos ou insumos conforme ficha tecnica."
      },
      {
        key: "blockOutOfStockSales",
        title: "Bloquear venda sem estoque",
        description: "Impede concluir venda quando faltar saldo de produto ou insumo controlado."
      },
      {
        key: "requireCancelReason",
        title: "Exigir motivo em cancelamentos",
        description: "Mantem motivo obrigatorio para cancelar pedido ou item."
      },
      {
        key: "requireCancelApproval",
        title: "Exigir aprovacao no cancelamento",
        description: "Operadores solicitam cancelamento e o caixa/gerente aprova antes de alterar a comanda."
      }
    ]
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
      <div className="space-y-5">
        {fieldSections.map((section) => (
          <section key={section.title} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4">
              <h4 className="font-semibold text-slate-950">{section.title}</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {section.fields.map((field) => {
                const enabled = form[field.key];

                return (
                  <button
                    key={field.key}
                    className={
                      enabled
                        ? "rounded-lg border border-brand-200 bg-white p-4 text-left transition hover:bg-brand-50"
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
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-4">
          <h4 className="font-semibold text-slate-950">Taxa de servico</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Define o percentual usado no atalho de taxa do caixa. Use 0 para deixar o atalho sem valor.
          </p>
        </div>
        <label className="block max-w-xs text-sm font-medium text-slate-700">
          Percentual padrao
          <div className="mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-3">
            <input
              className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none"
              max="100"
              min="0"
              step="0.01"
              type="number"
              value={form.serviceChargePercent}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceChargePercent: Number(event.target.value) }))
              }
            />
            <span className="text-sm font-semibold text-slate-500">%</span>
          </div>
        </label>
      </section>

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
