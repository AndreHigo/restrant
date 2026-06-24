"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { label: string; value: string; code?: string };
type ProductOption = { id: string; label: string; pricePerKg: number };
type TargetType = "COUNTER" | "TABLE" | "TAB";
type SourceMode = "MANUAL" | "DEVICE";

export function ScaleLaunchForm({
  products,
  tables,
  tabs,
  scaleDevices
}: {
  products: ProductOption[];
  tables: Option[];
  tabs: Option[];
  scaleDevices: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const targetCodeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    targetType: "TAB" as TargetType,
    targetId: "",
    targetCode: "",
    sourceMode: "DEVICE" as SourceMode,
    scaleDeviceId: scaleDevices[0]?.value ?? "",
    weightKg: "",
    notes: ""
  });

  const selectedTargetOptions = form.targetType === "TABLE" ? tables : form.targetType === "TAB" ? tabs : [];
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.productId),
    [form.productId, products]
  );

  const estimatedValue =
    selectedProduct && form.weightKg ? selectedProduct.pricePerKg * Number(form.weightKg || 0) : 0;

  useEffect(() => {
    targetCodeRef.current?.focus();
    targetCodeRef.current?.select();
  }, [form.targetType]);

  async function handleLaunch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPreview("");

    const response = await fetch("/api/operations/scale/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        targetType: form.targetType,
        targetId: form.targetType === "COUNTER" ? "" : form.targetId,
        targetCode: form.targetType === "COUNTER" ? "" : form.targetCode,
        scaleDeviceId: form.sourceMode === "DEVICE" ? form.scaleDeviceId : "",
        weightKg: form.sourceMode === "MANUAL" ? Number(form.weightKg) : undefined,
        sourceMode: form.sourceMode,
        notes: form.notes
      })
    });

    const payload = (await response.json()) as {
      error?: string;
      orderNumber?: string;
      reading?: { weightKg: number; totalPrice: number; deviceName: string };
    };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel lancar o item da balanca.");
      return;
    }

    if (payload.reading) {
      setPreview(
        `${payload.reading.deviceName}: ${payload.reading.weightKg.toFixed(3)} kg = ${payload.reading.totalPrice.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })}`
      );
    }

    setSuccess(`Item pesado lancado no pedido ${payload.orderNumber}.`);
    setForm((current) => ({
      ...current,
      targetId: "",
      targetCode: "",
      weightKg: "",
      notes: ""
    }));
    window.setTimeout(() => {
      targetCodeRef.current?.focus();
    }, 0);
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={handleLaunch}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Produto por quilo</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={form.productId}
            onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Destino</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={form.targetType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetType: event.target.value as TargetType,
                targetId: "",
                targetCode:
                  event.target.value === "TABLE"
                    ? tables[0]?.code ?? ""
                    : event.target.value === "TAB"
                      ? tabs[0]?.code ?? tabs[0]?.label ?? ""
                      : ""
              }))
            }
          >
            <option value="TAB">Comanda</option>
            <option value="TABLE">Mesa</option>
            <option value="COUNTER">Balcao</option>
          </select>
        </div>
      </div>

      {form.targetType !== "COUNTER" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {form.targetType === "TABLE" ? "Numero da mesa" : "Numero da comanda"}
          </label>
          <Input
            ref={targetCodeRef}
            list={`scale-target-${form.targetType.toLowerCase()}`}
            placeholder={form.targetType === "TABLE" ? "Ex.: 1, 01 ou M01" : "Ex.: C1001"}
            value={form.targetCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetId: "",
                targetCode: event.target.value
              }))
            }
          />
          <datalist id={`scale-target-${form.targetType.toLowerCase()}`}>
            {selectedTargetOptions.map((option) => (
              <option key={option.value} value={option.code ?? option.label}>
                {option.label}
              </option>
            ))}
          </datalist>
          <p className="mt-2 text-xs text-slate-500">
            Digite o numero no teclado da balanca e lance o peso direto na comanda ou mesa.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[0.8fr_1fr]">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Origem da leitura</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={form.sourceMode}
            onChange={(event) => setForm((current) => ({ ...current, sourceMode: event.target.value as SourceMode }))}
          >
            <option value="DEVICE">Balanca fisica</option>
            <option value="MANUAL">Peso manual</option>
          </select>
        </div>
        {form.sourceMode === "DEVICE" ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Dispositivo</label>
            <select
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={form.scaleDeviceId}
              onChange={(event) => setForm((current) => ({ ...current, scaleDeviceId: event.target.value }))}
            >
              {scaleDevices.map((device) => (
                <option key={device.value} value={device.value}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Peso em kg</label>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              value={form.weightKg}
              onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))}
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Observacoes</label>
        <Input
          placeholder="Ex.: prato do buffet da comanda 25"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Estimativa</span>
          <span className="font-semibold text-slate-900">
            {estimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          A leitura fica registrada em auditoria e o item entra direto no pedido do destino escolhido.
        </p>
      </div>

      {preview && <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">{preview}</div>}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Lancando..." : "Lancar na comanda/mesa"}
      </Button>
    </form>
  );
}
