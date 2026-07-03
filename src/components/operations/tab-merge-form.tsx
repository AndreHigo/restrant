"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TabMergeFormProps = {
  initialSourceCode?: string;
};

export function TabMergeForm({ initialSourceCode = "" }: TabMergeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceTabCode, setSourceTabCode] = useState(initialSourceCode.replace(/\D/g, ""));
  const [targetTabCode, setTargetTabCode] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const source = sourceTabCode.replace(/\D/g, "");
    const target = targetTabCode.replace(/\D/g, "");

    if (!source || !target) {
      setError("Informe as comandas de origem e destino.");
      return;
    }

    if (source === target) {
      setError("A comanda de destino deve ser diferente da origem.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/operations/tabs/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceTabCode: source,
        targetTabCode: target,
        reason
      })
    });
    const payload = (await response.json()) as { error?: string; ordersMoved?: number; targetTabCode?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel unir as comandas.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(`${payload.ordersMoved ?? 0} pedido(s) movido(s) para a comanda ${payload.targetTabCode ?? target}.`);
    setSourceTabCode("");
    setTargetTabCode("");
    setReason("");
    setIsSubmitting(false);
    startTransition(() => router.refresh());
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={onSubmit}>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Juntar comandas</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">Unir origem na comanda destino</h3>
      </div>

      <div className="grid gap-3 lg:grid-cols-[130px_130px_1fr_auto]">
        <Input
          className="h-11 text-sm"
          inputMode="numeric"
          placeholder="Origem"
          value={sourceTabCode}
          onChange={(event) => setSourceTabCode(event.target.value.replace(/\D/g, ""))}
        />
        <Input
          className="h-11 text-sm"
          inputMode="numeric"
          placeholder="Destino"
          value={targetTabCode}
          onChange={(event) => setTargetTabCode(event.target.value.replace(/\D/g, ""))}
        />
        <Input
          className="h-11 text-sm"
          placeholder="Motivo da uniao"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button className="h-11" disabled={isSubmitting || isPending} type="submit">
          {isSubmitting || isPending ? "Unindo..." : "Unir"}
        </Button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
    </form>
  );
}
