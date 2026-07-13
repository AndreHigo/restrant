"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type OrderItemEditFormProps = {
  currentDiscount: number;
  currentNotes: string;
  currentQuantity: number;
  isWeighable: boolean;
  salesOrderItemId: string;
};

export function OrderItemEditForm({
  currentDiscount,
  currentNotes,
  currentQuantity,
  isWeighable,
  salesOrderItemId
}: OrderItemEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(currentQuantity > 0 ? currentQuantity.toString() : "1");
  const [discount, setDiscount] = useState(formatCurrencyInput(currentDiscount));
  const [notes, setNotes] = useState(currentNotes);
  const [reason, setReason] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/operations/orders/items/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderItemId,
        quantity: isWeighable ? undefined : Number(quantity),
        discount: parseCurrencyInput(discount),
        notes,
        reason
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel editar o item.");
      setIsSubmitting(false);
      return;
    }

    setReason("");
    setIsSubmitting(false);
    startTransition(() => router.refresh());
  }

  return (
    <form className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="grid gap-2 sm:grid-cols-[120px_140px_1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {isWeighable ? "Peso" : "Qtd."}
          </label>
          <Input
            className="h-10 text-sm"
            disabled={isWeighable}
            min="0.001"
            step="0.001"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Desconto</label>
          <Input
            className="h-10 text-sm"
            inputMode="numeric"
            placeholder="R$ 0,00"
            type="text"
            value={discount}
            onChange={(event) => setDiscount(formatCurrencyInput(event.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Observacao</label>
          <Input
            className="h-10 text-sm"
            placeholder="Ex.: sem cebola, ponto da carne, extra..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      {isWeighable && (
        <p className="mt-2 text-xs text-amber-700">
          Produto por quilo: altere o peso no ajuste especifico abaixo.
        </p>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          className="h-10 text-sm"
          placeholder="Motivo da edicao"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button className="h-10" disabled={isSubmitting || isPending} type="submit" variant="secondary">
          {isSubmitting || isPending ? "Salvando..." : "Salvar item"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
