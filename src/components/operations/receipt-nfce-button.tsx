"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  salesOrderId: string;
};

export function ReceiptNfceButton({ salesOrderId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [createdDocumentId, setCreatedDocumentId] = useState("");

  async function prepareNfce() {
    setMessage("");
    setCreatedDocumentId("");

    const response = await fetch("/api/admin/fiscal/nfce/prepare", {
      body: JSON.stringify({
        salesOrderId
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json()) as {
      error?: string;
      id?: string;
      number?: string;
      series?: string;
      status?: string;
    };

    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Nao foi possivel preparar a NFC-e.");
      return;
    }

    setCreatedDocumentId(payload.id ?? "");
    setMessage(
      payload.number
        ? `NFC-e ${payload.series}/${payload.number} preparada.`
        : "NFC-e preparada para assinatura e transmissao."
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm font-semibold text-emerald-950">Nota fiscal opcional</p>
      <p className="mt-1 text-xs leading-5 text-emerald-800">
        O cupom acima e nao fiscal. Gere a NFC-e quando o cliente solicitar ou quando o restaurante decidir emitir.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-10 px-3 text-sm" disabled={isPending} type="button" variant="secondary" onClick={prepareNfce}>
          {isPending ? "Gerando..." : "Gerar NFC-e"}
        </Button>
        {(message || createdDocumentId) && (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
            href="/admin/fiscal"
          >
            Ir para fiscal
          </Link>
        )}
      </div>
      {message && <p className="mt-2 text-xs font-medium text-emerald-900">{message}</p>}
    </div>
  );
}
