"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodType } from "@prisma/client";
import { Button } from "@/components/ui/button";

type QuickPaymentActionsProps = {
  salesOrderId: string;
  remainingAmount: number;
  methods: Array<{ label: string; value: PaymentMethodType }>;
};

const preferredMethods: PaymentMethodType[] = ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"];

export function QuickPaymentActions({ salesOrderId, remainingAmount, methods }: QuickPaymentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [error, setError] = useState("");

  const quickMethods = preferredMethods
    .map((method) => methods.find((item) => item.value === method))
    .filter((item): item is { label: string; value: PaymentMethodType } => Boolean(item));

  async function pay(method: PaymentMethodType) {
    setError("");
    setSelectedMethod(method);

    const response = await fetch("/api/operations/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        payments: [
          {
            method,
            amount: remainingAmount
          }
        ]
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel quitar o pedido.");
      setSelectedMethod(null);
      return;
    }

    startTransition(() => router.refresh());
  }

  if (quickMethods.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-800">Quitacao rapida</p>
        <p className="text-sm font-medium text-emerald-900">
          {remainingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {quickMethods.map((method) => (
          <Button
            key={method.value}
            disabled={isPending}
            type="button"
            variant="secondary"
            onClick={() => pay(method.value)}
          >
            {isPending && selectedMethod === method.value ? "Quitando..." : method.label}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
