"use client";

import { FormEvent, useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileDetailsFormProps = {
  email: string;
  name: string;
};

export function ProfileDetailsForm({ email, name }: ProfileDetailsFormProps) {
  const [form, setForm] = useState({ email, name });
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
      const response = await fetch("/api/profile", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Nao foi possivel atualizar o perfil.");
        return;
      }

      setForm({
        email: data.email ?? form.email,
        name: data.name ?? form.name
      });
      setSuccess("Perfil atualizado com sucesso.");
    });
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Dados pessoais</p>
          <h2 className="text-lg font-semibold text-slate-950">Editar perfil</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nome exibido
          <Input
            autoComplete="name"
            maxLength={120}
            minLength={3}
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Usuario de acesso
          <Input
            autoComplete="username"
            maxLength={160}
            minLength={3}
            required
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          <span className="text-xs font-normal leading-5 text-slate-500">
            Pode ser nome de usuario ou e-mail, sem espacos.
          </span>
        </label>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <Button className="mt-5 w-full" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}
