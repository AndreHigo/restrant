"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CashRegisterOpenForm() {
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCurrencyInput(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number(onlyDigits(value)) / 100;

  if (Number.isNaN(numericValue)) {
    return "R$ 0,00";
  }

  return numericValue.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency"
  });
}

function parseCurrencyInput(value: string) {
  return Number((Number(onlyDigits(value)) / 100).toFixed(2));
}
