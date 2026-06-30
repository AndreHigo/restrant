"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ScaleDeviceFormState = {
  name: string;
  identifier: string;
  connectionType: string;
  port: string;
  baudRate: string;
  endpoint: string;
  active: boolean;
};

const initialState: ScaleDeviceFormState = {
  name: "",
  identifier: "",
  connectionType: "serial",
  port: "",
  baudRate: "9600",
  endpoint: "",
  active: true
};

type ScaleDeviceOption = {
  id: string;
  name: string;
  identifier: string;
  connectionType: string;
  port: string;
  baudRate: number | null;
  endpoint: string;
  active: boolean;
};

export function ScaleDeviceForm({ devices }: { devices: ScaleDeviceOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(initialState);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedDevice = devices.find((device) => device.id === editingId);

  function updateField(name: keyof ScaleDeviceFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startCreate() {
    setEditingId("");
    setForm(initialState);
    setError("");
    setSuccess("");
  }

  function startEdit(id: string) {
    const device = devices.find((item) => item.id === id);
    setEditingId(id);
    setError("");
    setSuccess("");

    if (!device) {
      setForm(initialState);
      return;
    }

    setForm({
      name: device.name,
      identifier: device.identifier,
      connectionType: device.connectionType,
      port: device.port,
      baudRate: device.baudRate ? String(device.baudRate) : "",
      endpoint: device.endpoint,
      active: device.active
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch(editingId ? `/api/admin/scale-devices/${editingId}` : "/api/admin/scale-devices", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cadastrar a balanca.");
      return;
    }

    if (!editingId) {
      setForm(initialState);
    }

    setSuccess(editingId ? "Balanca atualizada." : "Balanca cadastrada.");
    startTransition(() => router.refresh());
  }

  async function toggleActive() {
    if (!editingId || !selectedDevice) {
      setError("Selecione uma balanca para alterar o status.");
      return;
    }

    setError("");
    setSuccess("");

    const nextActive = !form.active;
    const response = await fetch(`/api/admin/scale-devices/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, active: nextActive })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel alterar o status da balanca.");
      return;
    }

    setForm((current) => ({ ...current, active: nextActive }));
    setSuccess(nextActive ? "Balanca ativada." : "Balanca inativada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {devices.length > 0 && (
        <label className="block text-sm font-medium text-slate-700">
          Editar existente
          <select
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            value={editingId}
            onChange={(event) => (event.target.value ? startEdit(event.target.value) : startCreate())}
          >
            <option value="">Nova balanca</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} - {device.active ? "ativa" : "inativa"}
              </option>
            ))}
          </select>
        </label>
      )}

      {editingId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="font-medium text-slate-700">Status do dispositivo</span>
          <Badge tone={form.active ? "success" : "default"}>{form.active ? "Ativa" : "Inativa"}</Badge>
        </div>
      )}

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
        {isPending ? "Salvando..." : editingId ? "Atualizar balanca" : "Cadastrar balanca"}
      </Button>
      {editingId && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={toggleActive}>
            {form.active ? "Inativar" : "Ativar"}
          </Button>
          <Button type="button" variant="ghost" onClick={startCreate}>
            Nova balanca
          </Button>
        </div>
      )}
    </form>
  );
}
