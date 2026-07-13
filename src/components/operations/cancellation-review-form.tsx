"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CancellationReviewFormProps = {
  requestId: string;
};

export function CancellationReviewForm({ requestId }: CancellationReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");

  async function review(approved: boolean) {
    setError("");

    const response = await fetch("/api/operations/cancellations/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        approved,
        reviewNote
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel revisar o cancelamento.");
      return;
    }

    setReviewNote("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-3 space-y-2">
      <Input
        className="h-10 text-sm"
        placeholder="Observacao da aprovacao ou rejeicao"
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button className="h-10" disabled={isPending} type="button" variant="secondary" onClick={() => review(true)}>
          Aprovar
        </Button>
        <Button className="h-10" disabled={isPending} type="button" variant="ghost" onClick={() => review(false)}>
          Rejeitar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
