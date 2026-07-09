"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type PayableOption = {
  code?: string;
  label: string;
  value: string;
  detail: string;
  remaining: number;
};

export function PayablePaymentForm({ payables }: { payables: PayableOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountPayableId, setAccountPayableId] = useState(payables[0]?.value ?? "");
  const selectedPayable = payables.find((item) => item.value === accountPayableId);
  const [amount, setAmount] = useState(formatCurrencyInput(selectedPayable?.remaining ?? 0));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (payables.length > 0 && !payables.some((item) => item.value === accountPayableId)) {
      setAccountPayableId(payables[0].value);
    }
  }, [accountPayableId, payables]);

  useEffect(() => {
    setAmount(formatCurrencyInput(selectedPayable?.remaining ?? 0));
  }, [selectedPayable?.remaining]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/financial/payables/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountPayableId,
        amount: parseCurrencyInput(amount),
        notes
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel baixar a conta.");
      return;
    }

    setSuccess("Pagamento da conta registrado.");
    setNotes("");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <CodeLookupField
          disabled={payables.length === 0}
          emptyLabel="Nenhuma conta pendente"
          label="Conta pendente"
          options={payables.map((item) => ({
            code: item.code,
            label: item.label,
            meta: item.detail,
            value: item.value
          }))}
          placeholder="Digite pedido, fornecedor, descricao ou valor"
          value={accountPayableId}
          onChange={setAccountPayableId}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Valor pago</span>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
          />
          {selectedPayable && (
            <span className="text-xs text-slate-500">
              Saldo: {selectedPayable.remaining.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}
            </span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Observacao</span>
          <Input
            placeholder="Ex.: pago parcialmente via PIX"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending || payables.length === 0} type="submit">
        {isPending ? "Baixando..." : "Registrar pagamento"}
      </Button>
    </form>
  );
}
