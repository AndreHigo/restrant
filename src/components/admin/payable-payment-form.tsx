"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";

type PayableOption = {
  code?: string;
  label: string;
  value: string;
  detail: string;
};

export function PayablePaymentForm({ payables }: { payables: PayableOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountPayableId, setAccountPayableId] = useState(payables[0]?.value ?? "");

  useEffect(() => {
    if (payables.length > 0 && !payables.some((item) => item.value === accountPayableId)) {
      setAccountPayableId(payables[0].value);
    }
  }, [accountPayableId, payables]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/financial/payables/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountPayableId })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel baixar a conta.");
      return;
    }

    setSuccess("Conta a pagar baixada.");
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
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending || payables.length === 0} type="submit">
        {isPending ? "Baixando..." : "Marcar como pago"}
      </Button>
    </form>
  );
}
