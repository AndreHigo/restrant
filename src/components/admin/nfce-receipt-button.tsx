"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  fiscalDocumentId: string;
};

export function NfceReceiptButton({ disabled, fiscalDocumentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function queryReceipt() {
    setMessage("");

    const response = await fetch("/api/admin/fiscal/nfce/receipt", {
      body: JSON.stringify({
        fiscalDocumentId
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json()) as {
      error?: string;
      protocolNumber?: string;
      transmissionStatus?: string;
      xMotivo?: string;
    };

    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Nao foi possivel consultar o recibo.");
      startTransition(() => router.refresh());
      return;
    }

    setMessage(
      payload.protocolNumber
        ? `Protocolo: ${payload.protocolNumber}`
        : `Retorno: ${payload.transmissionStatus ?? payload.xMotivo ?? "processado"}`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2 space-y-2">
      <Button className="h-9 px-3 text-xs" disabled={disabled || isPending} type="button" variant="ghost" onClick={queryReceipt}>
        {isPending ? "Consultando..." : "Consultar recibo"}
      </Button>
      {message && <p className="max-w-56 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
