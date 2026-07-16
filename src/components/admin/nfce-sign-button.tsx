"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  fiscalDocumentId: string;
};

export function NfceSignButton({ disabled, fiscalDocumentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function signXml() {
    setMessage("");

    const response = await fetch("/api/admin/fiscal/nfce/sign", {
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
      signatureStatus?: string;
    };

    if (!response.ok) {
      setMessage(payload.error ?? "Nao foi possivel assinar o XML.");
      return;
    }

    setMessage(`Assinado: ${payload.signatureStatus ?? "SIGNED_PENDING_TRANSMISSION"}`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2 space-y-2">
      <Button className="h-9 px-3 text-xs" disabled={disabled || isPending} type="button" variant="secondary" onClick={signXml}>
        {isPending ? "Assinando..." : "Assinar XML"}
      </Button>
      {message && <p className="max-w-56 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
