"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ProductionStatus = "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELED";

export function ProductionStatusForm({
  label,
  productionItemId,
  status,
  variant = "secondary"
}: {
  label: string;
  productionItemId: string;
  status: ProductionStatus;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const requiresReason = status === "CANCELED";

  async function onClick() {
    setError("");

    const response = await fetch("/api/operations/production/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productionItemId,
        reason: requiresReason ? reason : "",
        status
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Nao foi possivel atualizar a producao.");
      return;
    }

    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <div className={requiresReason ? "grid gap-2 sm:min-w-72" : ""} data-testid={`production-action-${status.toLowerCase()}`}>
      {requiresReason ? (
        <input
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="Motivo do cancelamento"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      ) : null}
      <Button className="h-11 min-w-36 text-sm" disabled={isPending} type="button" variant={variant} onClick={onClick}>
        {isPending ? "Atualizando..." : label}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
