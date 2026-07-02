"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialForm = {
  confirmPassword: "",
  newPassword: ""
};

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        body: JSON.stringify({
          token,
          ...form
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel redefinir a senha.");
        return;
      }

      setForm(initialForm);
      setSuccess("Senha redefinida com sucesso.");
      window.setTimeout(() => {
        router.push("/login");
      }, 900);
    });
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Link de redefinicao incompleto ou expirado.
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Seguranca</p>
          <h2 className="text-xl font-semibold text-slate-950">Redefinir senha</h2>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Nova senha
        <Input
          autoComplete="new-password"
          minLength={8}
          required
          type="password"
          value={form.newPassword}
          onChange={(event) => updateField("newPassword", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Confirmar nova senha
        <Input
          autoComplete="new-password"
          minLength={8}
          required
          type="password"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
        />
      </label>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Redefinindo..." : "Redefinir senha"}
      </Button>
      <Link className="block text-center text-sm font-medium text-brand-800" href="/login">
        Voltar para login
      </Link>
    </form>
  );
}
