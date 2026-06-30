"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ScaleDeviceFormState = {
  name: string;
  identifier: string;
  connectionType: string;
  port: string;
  baudRate: string;
  endpoint: string;
};

const initialState: ScaleDeviceFormState = {
  name: "",
  identifier: "",
  connectionType: "serial",
  port: "",
  baudRate: "9600",
  endpoint: ""
};

export function ScaleDeviceForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(name: keyof ScaleDeviceFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/scale-devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cadastrar a balanca.");
      return;
    }

    setForm(initialState);
    setSuccess("Balanca cadastrada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Nome
        <input
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          placeholder="Balanca buffet"
          required
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Identificador unico
        <input
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          placeholder="balanca-buffet-01"
          required
          value={form.identifier}
          onChange={(event) => updateField("identifier", event.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Conexao
          <select
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            value={form.connectionType}
            onChange={(event) => updateField("connectionType", event.target.value)}
          >
            <option value="serial">Serial</option>
            <option value="usb">USB</option>
            <option value="api">API</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Baud rate
          <input
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            inputMode="numeric"
            value={form.baudRate}
            onChange={(event) => updateField("baudRate", event.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Porta
        <input
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          placeholder="COM3, /dev/ttyUSB0 ou USB-01"
          value={form.port}
          onChange={(event) => updateField("port", event.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Endpoint API
        <input
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          placeholder="http://localhost:4010/scale"
          value={form.endpoint}
          onChange={(event) => updateField("endpoint", event.target.value)}
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Cadastrar balanca"}
      </Button>
    </form>
  );
}
