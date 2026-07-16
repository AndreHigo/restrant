"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  fiscalDocumentId: string;
};

export function NfceTransmitButton({ disabled, fiscalDocumentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function transmit() {
    setMessage("");

    const response = await fetch("/api/admin/fiscal/nfce/transmit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fiscalDocumentId
      })
    });
    const payload = (await response.json()) as {
      error?: string;
      protocolNumber?: string;
      transmissionStatus?: string;
      xMotivo?: string;
    };

    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Nao foi possivel transmitir a NFC-e.");
      startTransition(() => router.refresh());
      return;
    }

    setMessage(
      payload.protocolNumber
        ? `Autorizada: ${payload.protocolNumber}`
        : `Retorno: ${payload.transmissionStatus ?? payload.xMotivo ?? "processado"}`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2 space-y-2">
      <Button className="h-9 px-3 text-xs" disabled={disabled || isPending} type="button" variant="secondary" onClick={transmit}>
        {isPending ? "Transmitindo..." : "Transmitir SVRS"}
      </Button>
      {message && <p className="max-w-56 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
