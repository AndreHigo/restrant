"use client";

import { FormEvent, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const passwordHint = "Minimo de 10 caracteres com maiuscula, minuscula, numero e simbolo.";

const initialForm = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: ""
};

export function PasswordChangeForm() {
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
      const response = await fetch("/api/profile/password", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Nao foi possivel trocar a senha.");
        return;
      }

      setForm(initialForm);
      setSuccess("Senha atualizada com sucesso.");
    });
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Seguranca</p>
          <h2 className="text-lg font-semibold text-slate-950">Trocar senha</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Senha atual
          <Input
            autoComplete="current-password"
            required
            type="password"
            value={form.currentPassword}
            onChange={(event) => updateField("currentPassword", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nova senha
          <Input
            autoComplete="new-password"
            minLength={10}
            required
            type="password"
            value={form.newPassword}
            onChange={(event) => updateField("newPassword", event.target.value)}
          />
          <span className="text-xs font-normal text-slate-500">{passwordHint}</span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Confirmar nova senha
          <Input
            autoComplete="new-password"
            minLength={10}
            required
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <Button className="mt-5 w-full" disabled={isPending} type="submit">
        {isPending ? "Atualizando..." : "Atualizar senha"}
      </Button>
    </form>
  );
}
