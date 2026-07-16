"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  fiscalDocumentId: string;
};

export function NfceCancelButton({ disabled, fiscalDocumentId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [justification, setJustification] = useState("");
  const [message, setMessage] = useState("");

  async function cancelDocument() {
    setMessage("");

    const response = await fetch("/api/admin/fiscal/nfce/cancel", {
      body: JSON.stringify({
        fiscalDocumentId,
        justification
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json()) as {
      error?: string;
      status?: string;
      transmissionStatus?: string;
      xMotivo?: string;
    };

    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Nao foi possivel cancelar a NFC-e.");
      startTransition(() => router.refresh());
      return;
    }

    setMessage(payload.status === "CANCELED" ? "NFC-e cancelada." : payload.xMotivo ?? payload.transmissionStatus ?? "Processado.");
    setJustification("");
    setIsOpen(false);
    startTransition(() => router.refresh());
  }

  if (!isOpen) {
    return (
      <div className="mt-2 space-y-2">
        <Button className="h-9 px-3 text-xs" disabled={disabled || isPending} type="button" variant="ghost" onClick={() => setIsOpen(true)}>
          Cancelar NFC-e
        </Button>
        {message && <p className="max-w-56 text-xs text-slate-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 max-w-72 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <label className="block text-xs font-medium text-amber-950">
        Justificativa do cancelamento
        <textarea
          className="mt-2 min-h-20 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          maxLength={255}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
        />
      </label>
      {message && <p className="mt-2 text-xs text-amber-800">{message}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-9 px-3 text-xs"
          disabled={disabled || isPending || justification.trim().length < 15}
          type="button"
          variant="secondary"
          onClick={cancelDocument}
        >
          {isPending ? "Cancelando..." : "Confirmar cancelamento"}
        </Button>
        <Button className="h-9 px-3 text-xs" disabled={isPending} type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
