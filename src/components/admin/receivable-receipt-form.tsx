"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type ReceivableOption = {
  code?: string;
  label: string;
  value: string;
  detail: string;
  remaining: number;
};

export function ReceivableReceiptForm({ receivables }: { receivables: ReceivableOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountReceivableId, setAccountReceivableId] = useState(receivables[0]?.value ?? "");
  const selectedReceivable = receivables.find((item) => item.value === accountReceivableId);
  const [amount, setAmount] = useState(formatCurrencyInput(selectedReceivable?.remaining ?? 0));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (receivables.length > 0 && !receivables.some((item) => item.value === accountReceivableId)) {
      setAccountReceivableId(receivables[0].value);
    }
  }, [accountReceivableId, receivables]);

  useEffect(() => {
    setAmount(formatCurrencyInput(selectedReceivable?.remaining ?? 0));
  }, [selectedReceivable?.remaining]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/financial/receivables/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountReceivableId,
        amount: parseCurrencyInput(amount),
        notes
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel registrar o recebimento.");
      return;
    }

    setSuccess("Recebimento registrado.");
    setNotes("");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <CodeLookupField
        disabled={receivables.length === 0}
        emptyLabel="Nenhuma conta pendente"
        label="Conta a receber"
        options={receivables.map((item) => ({
          code: item.code,
          label: item.label,
          meta: item.detail,
          value: item.value
        }))}
        placeholder="Digite venda, cliente, descricao ou valor"
        value={accountReceivableId}
        onChange={setAccountReceivableId}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Valor recebido</span>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
          />
          {selectedReceivable && (
            <span className="text-xs text-slate-500">
              Saldo: {selectedReceivable.remaining.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}
            </span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Observacao</span>
          <Input
            placeholder="Ex.: recebido parcialmente no PIX"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending || receivables.length === 0} type="submit">
        {isPending ? "Registrando..." : "Registrar recebimento"}
      </Button>
    </form>
  );
}
