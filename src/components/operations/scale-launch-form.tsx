"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type Option = { label: string; value: string; code?: string };
type ProductOption = { code?: string; id: string; label: string; pricePerKg: number };
type TargetType = "COUNTER" | "TABLE" | "TAB";
type SourceMode = "MANUAL" | "DEVICE";

export function ScaleLaunchForm({
  products,
  tables,
  tabs,
  scaleDevices,
  initialTargetCode = "",
  allowManualWeightInput = true,
  enableCounter = true,
  enableTableService = true
}: {
  products: ProductOption[];
  tables: Option[];
  tabs: Option[];
  scaleDevices: Option[];
  initialTargetCode?: string;
  allowManualWeightInput?: boolean;
  enableCounter?: boolean;
  enableTableService?: boolean;
}) {
  const targetCodeRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState("");
  const [recentLaunches, setRecentLaunches] = useState<
    Array<{ destination: string; grossWeightKg: number; netWeightKg: number; tareKg: number; totalPrice: number }>
  >([]);
  const [repeatMode, setRepeatMode] = useState({
    keepProduct: true,
    keepTarget: Boolean(initialTargetCode)
  });
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    targetType: "TAB" as TargetType,
    targetId: "",
    targetCode: initialTargetCode,
    sourceMode: (scaleDevices.length > 0 ? "DEVICE" : allowManualWeightInput ? "MANUAL" : "DEVICE") as SourceMode,
    scaleDeviceId: scaleDevices[0]?.value ?? "",
    weightKg: "",
    notes: ""
  });

  const selectedTargetOptions = form.targetType === "TABLE" ? tables : form.targetType === "TAB" ? tabs : [];
  const targetOptions: Array<{ label: string; value: TargetType }> = [
    { label: "Comanda", value: "TAB" },
    ...(enableTableService ? [{ label: "Mesa", value: "TABLE" as const }] : []),
    ...(enableCounter ? [{ label: "Balcao", value: "COUNTER" as const }] : [])
  ];
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.productId),
    [form.productId, products]
  );

  const estimatedValue =
    selectedProduct && form.weightKg ? selectedProduct.pricePerKg * Number(form.weightKg || 0) : 0;
  const destinationLabel =
    form.targetType === "COUNTER"
      ? "Balcao"
      : `${form.targetType === "TABLE" ? "Mesa" : "Comanda"} ${form.targetCode || "-"}`;
  const selectedProductLabel = selectedProduct?.label.split(" - ")[0] ?? "Produto por quilo";
  const manualWeight = Number(form.weightKg || 0);
  const canLaunch =
    Boolean(form.productId) &&
    (form.targetType === "COUNTER" || Boolean(form.targetCode.trim())) &&
    (form.sourceMode === "DEVICE" ? Boolean(form.scaleDeviceId || scaleDevices.length === 0) : manualWeight > 0);

  useEffect(() => {
    targetCodeRef.current?.focus();
    targetCodeRef.current?.select();
  }, [form.targetType]);

  async function handleLaunch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPreview("");
    setIsSubmitting(true);

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
      reading?: {
        grossWeightKg: number;
        netWeightKg: number;
        tareKg: number;
        totalPrice: number;
        weightKg: number;
        deviceName: string;
      };
    };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel lancar o item da balanca.");
      setIsSubmitting(false);
      return;
    }

    if (payload.reading) {
      const reading = payload.reading;
      setRecentLaunches((current) => [
        {
          destination: destinationLabel,
          grossWeightKg: reading.grossWeightKg,
          netWeightKg: reading.netWeightKg,
          tareKg: reading.tareKg,
          totalPrice: reading.totalPrice
        },
        ...current
      ].slice(0, 5));
      setPreview(
        `${reading.deviceName}: bruto ${reading.grossWeightKg.toFixed(3)} kg, tara ${reading.tareKg.toFixed(3)} kg, liquido ${reading.netWeightKg.toFixed(3)} kg = ${reading.totalPrice.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })}`
      );
    }

    setSuccess(`Item pesado lancado no pedido ${payload.orderNumber}.`);
    setForm((current) => ({
      ...current,
      productId: repeatMode.keepProduct ? current.productId : products[0]?.id ?? "",
      targetId: "",
      targetCode: repeatMode.keepTarget ? current.targetCode : "",
      weightKg: "",
      notes: ""
    }));
    setIsSubmitting(false);
    window.setTimeout(() => {
      if (repeatMode.keepTarget) {
        weightInputRef.current?.focus();
        weightInputRef.current?.select();
        return;
      }

      targetCodeRef.current?.focus();
      targetCodeRef.current?.select();
    }, 0);
  }

  return (
    <form className="space-y-4" data-testid="scale-launch-form" onSubmit={handleLaunch}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <CodeLookupField
            label="Produto por quilo"
            options={products.map((product) => ({
              code: product.code,
              label: product.label,
              meta: `${product.pricePerKg.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}/kg`,
              value: product.id
            }))}
            placeholder="Digite codigo ou nome do produto"
            value={form.productId}
            onChange={(value) => setForm((current) => ({ ...current, productId: value }))}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Destino</label>
          <select
            data-testid="scale-target-type"
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
            {targetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.targetType !== "COUNTER" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {form.targetType === "TABLE" ? "Numero da mesa" : "Numero da comanda"}
          </label>
          <Input
            autoFocus
            ref={targetCodeRef}
            data-testid="scale-target-code"
            list={`scale-target-${form.targetType.toLowerCase()}`}
            placeholder={form.targetType === "TABLE" ? "Ex.: 1" : "Ex.: 25"}
            value={form.targetCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetId: "",
                targetCode: event.target.value.replace(/\D/g, "")
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
            data-testid="scale-source-mode"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={form.sourceMode}
            onChange={(event) => setForm((current) => ({ ...current, sourceMode: event.target.value as SourceMode }))}
          >
            <option value="DEVICE">Balanca fisica</option>
            {allowManualWeightInput ? <option value="MANUAL">Peso manual</option> : null}
          </select>
          {!allowManualWeightInput && (
            <p className="mt-2 text-xs text-slate-500">
              Peso manual desativado nas configuracoes. Use uma balanca fisica cadastrada.
            </p>
          )}
        </div>
        {form.sourceMode === "DEVICE" ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Dispositivo</label>
            <select
              data-testid="scale-device"
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
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-700">Peso em kg</label>
              <div className="flex gap-1">
                {["0.300", "0.500", "0.750"].map((weight) => (
                  <button
                    key={weight}
                    className="h-7 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, weightKg: weight }));
                      window.setTimeout(() => weightInputRef.current?.focus(), 0);
                    }}
                  >
                    {weight}
                  </button>
                ))}
              </div>
            </div>
            <Input
              ref={weightInputRef}
              data-testid="scale-weight"
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
          data-testid="scale-notes"
          placeholder="Ex.: prato do buffet da comanda 25"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-slate-50 px-3 text-slate-700">
          <input
            checked={repeatMode.keepTarget}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            type="checkbox"
            onChange={(event) => setRepeatMode((current) => ({ ...current, keepTarget: event.target.checked }))}
          />
          <span>Manter comanda/mesa apos lancar</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-slate-50 px-3 text-slate-700">
          <input
            checked={repeatMode.keepProduct}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            type="checkbox"
            onChange={(event) => setRepeatMode((current) => ({ ...current, keepProduct: event.target.checked }))}
          />
          <span>Manter produto por quilo</span>
        </label>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">Destino</p>
            <p className="mt-1 font-semibold text-slate-950">{destinationLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">Produto</p>
            <p className="mt-1 truncate font-semibold text-slate-950">{selectedProductLabel}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">Valor previsto</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {estimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {form.sourceMode === "DEVICE"
            ? "A balanca fisica aplica tara configurada, registra leitura bruta/liquida e audita o lancamento."
            : `Peso manual: ${manualWeight > 0 ? manualWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "0,000"} kg.`}
        </p>
      </div>

      {preview && <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">{preview}</div>}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <Button className="w-full" data-testid="scale-submit" disabled={isSubmitting || !canLaunch} type="submit">
        {isSubmitting ? "Lancando..." : "Confirmar pesagem e lancar"}
      </Button>

      {recentLaunches.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ultimas pesagens nesta tela</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLaunches.map((item, index) => (
              <div key={`${item.destination}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{item.destination}</p>
                  <p className="text-xs text-slate-500">
                    Liquido {item.netWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                    {" "} | Tara {item.tareKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-slate-950">
                  {item.totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
