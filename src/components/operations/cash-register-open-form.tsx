"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type CashRegisterOpenFormProps = {
  canOpenCashRegister: boolean;
};

export function CashRegisterOpenForm({ canOpenCashRegister }: CashRegisterOpenFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    openingAmount: formatCurrencyInput(0),
    notes: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/cash-register/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openingAmount: parseCurrencyInput(form.openingAmount),
        notes: form.notes
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel abrir o caixa.");
      return;
    }

    startTransition(() => router.refresh());
  }

  if (!canOpenCashRegister) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Abrir caixa exige permissao especifica do perfil.
      </div>
    );
  }

  return (
    <form className="grid gap-3 2xl:grid-cols-[0.8fr_1fr_auto]" onSubmit={onSubmit}>
      <Input
        className="h-12 px-4 text-[15px]"
        inputMode="numeric"
        placeholder="R$ 0,00"
        type="text"
        value={form.openingAmount}
        onChange={(event) =>
          setForm((current) => ({ ...current, openingAmount: formatCurrencyInput(event.target.value) }))
        }
      />
      <Input
        className="h-12 px-4 text-[15px]"
        placeholder="Observacao da abertura"
        value={form.notes}
        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
      />
      <Button className="h-12 text-[15px]" disabled={isPending} type="submit">
        {isPending ? "Abrindo..." : "Abrir caixa"}
      </Button>
      {error && <p className="text-xs text-red-600 md:col-span-3">{error}</p>}
    </form>
  );
}
