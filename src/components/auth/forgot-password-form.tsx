"use client";

import { FormEvent, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        body: JSON.stringify({ email: identifier }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel registrar a solicitacao.");
        return;
      }

      setMessage(payload.message ?? "Solicitacao registrada.");
      setResetUrl(payload.resetUrl ?? "");
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Acesso</p>
          <h2 className="text-xl font-semibold text-slate-950">Recuperar senha</h2>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Usuario ou e-mail
        <Input
          autoComplete="username"
          placeholder="caixa01 ou admin@restaurante.local"
          required
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </label>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {resetUrl ? (
        <a
          className="block rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
          href={resetUrl}
        >
          Abrir link de redefinicao
        </a>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Registrando..." : "Solicitar redefinicao"}
      </Button>
    </form>
  );
}
