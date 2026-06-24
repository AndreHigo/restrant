"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { label: string; value: string };
type TabOption = Option & { code: string };
type ProductOption = { id: string; label: string; price: number; typeLabel: string; isWeighable: boolean };
type OrderChannel = "COUNTER" | "TABLE" | "TAB" | "TAKEOUT" | "DELIVERY" | "POS";
type ScaleMode = "MANUAL" | "DEVICE";
type OrderItemForm = {
  productId: string;
  quantity: string;
  notes: string;
  weightKg: string;
  scaleReadingId: string;
  scaleMode: ScaleMode;
  scaleDeviceId: string;
  readingSummary: string;
};

export function OrderCreateForm({
  customers,
  tables,
  tabs,
  products,
  scaleDevices
}: {
  customers: Option[];
  tables: Option[];
  tabs: TabOption[];
  products: ProductOption[];
  scaleDevices: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<{
    channel: OrderChannel;
    customerId: string;
    tableId: string;
    tabId: string;
    tabCode: string;
    notes: string;
    items: OrderItemForm[];
  }>({
    channel: "TAB",
    customerId: "",
    tableId: "",
    tabId: "",
    tabCode: "",
    notes: "",
    items: [
      {
        productId: products[0]?.id ?? "",
        quantity: "1",
        notes: "",
        weightKg: "",
        scaleReadingId: "",
        scaleMode: "MANUAL",
        scaleDeviceId: scaleDevices[0]?.value ?? "",
        readingSummary: ""
      }
    ]
  });

  const selectedChannel = form.channel;

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId);
  }

  const orderPreviewTotal = form.items.reduce((sum, item) => {
    const product = findProduct(item.productId);
    const quantity = Number(item.quantity);

    if (!product) {
      return sum;
    }

    if (product.isWeighable) {
      const weight = Number(item.weightKg);
      return sum + product.price * (Number.isNaN(weight) ? 0 : weight);
    }

    if (Number.isNaN(quantity)) {
      return sum;
    }

    return sum + product.price * quantity;
  }, 0);

  function createEmptyItem(productId?: string): OrderItemForm {
    return {
      productId: productId ?? products[0]?.id ?? "",
      quantity: "1",
      notes: "",
      weightKg: "",
      scaleReadingId: "",
      scaleMode: "MANUAL",
      scaleDeviceId: scaleDevices[0]?.value ?? "",
      readingSummary: ""
    };
  }

  function updateItem(
    index: number,
    key:
      | "productId"
      | "quantity"
      | "notes"
      | "weightKg"
      | "scaleMode"
      | "scaleDeviceId"
      | "scaleReadingId"
      | "readingSummary",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? key === "productId"
            ? {
                ...createEmptyItem(value),
                notes: item.notes
              }
            : { ...item, [key]: value }
          : item
      )
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/operations/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tabId: form.channel === "TAB" ? form.tabId : "",
        tabCode: form.channel === "TAB" ? form.tabCode : "",
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.scaleReadingId && item.weightKg ? item.weightKg : item.quantity),
          weightKg: item.weightKg ? Number(item.weightKg) : undefined,
          scaleReadingId: item.scaleReadingId,
          notes: item.notes
        }))
      })
    });

    const payload = (await response.json()) as { error?: string; appendedToExistingOrder?: boolean; number?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel criar o pedido.");
      return;
    }

    setSuccess(
      payload.appendedToExistingOrder
        ? `Itens adicionados ao pedido ${payload.number ?? ""}.`.trim()
        : `Pedido ${payload.number ?? ""} criado com sucesso.`.trim()
    );
    startTransition(() => router.refresh());
  }

  async function captureWeight(index: number) {
    const item = form.items[index];
    const product = findProduct(item.productId);

    if (!product?.isWeighable) {
      setError("A leitura de balanca so pode ser usada em produtos por quilo.");
      return;
    }

    setError("");
    setSuccess("");

    const response = await fetch("/api/operations/scale/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        scaleDeviceId: item.scaleMode === "DEVICE" ? item.scaleDeviceId : "",
        weightKg: item.scaleMode === "MANUAL" ? Number(item.weightKg) : undefined,
        sourceMode: item.scaleMode,
        notes: item.notes
      })
    });

    const payload = (await response.json()) as {
      error?: string;
      id: string;
      weightKg: number;
      totalPrice: number;
      source: string;
      deviceName: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel capturar a leitura da balanca.");
      return;
    }

    setForm((current) => ({
      ...current,
      items: current.items.map((entry, itemIndex) =>
        itemIndex === index
          ? {
              ...entry,
              quantity: payload.weightKg.toFixed(3),
              weightKg: payload.weightKg.toFixed(3),
              scaleReadingId: payload.id,
              readingSummary: `${payload.deviceName}: ${payload.weightKg.toFixed(3)} kg = ${payload.totalPrice.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}`
            }
          : entry
      )
    }));

    setSuccess("Leitura de balanca capturada e pronta para lancar no pedido.");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Canal</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.channel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                channel: event.target.value as OrderChannel,
                tableId: event.target.value === "TABLE" ? current.tableId : "",
                tabId: event.target.value === "TAB" ? current.tabId : "",
                tabCode: event.target.value === "TAB" ? current.tabCode : "",
                customerId: current.customerId
              }))
            }
          >
            <option value="COUNTER">Balcao</option>
            <option value="TABLE">Mesa</option>
            <option value="TAB">Comanda</option>
            <option value="TAKEOUT">Retirada</option>
            <option value="DELIVERY">Delivery</option>
            <option value="POS">PDV</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Cliente</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.customerId}
            onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
            disabled={selectedChannel === "TABLE" || selectedChannel === "TAB"}
          >
            <option value="">Nao informar</option>
            {customers.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Mesa</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.tableId}
            onChange={(event) => setForm((current) => ({ ...current, tableId: event.target.value }))}
            disabled={selectedChannel !== "TABLE"}
          >
            <option value="">Nao informar</option>
            {tables.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Numero da comanda</label>
          <Input
            list="order-tabs"
            placeholder="Ex.: 25"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.tabCode}
            onChange={(event) =>
              setForm((current) => {
                const selectedTab = tabs.find((item) => item.code === event.target.value);

                return {
                  ...current,
                  tabCode: event.target.value,
                  tabId: selectedTab?.value ?? ""
                };
              })
            }
            disabled={selectedChannel !== "TAB"}
          />
          <datalist id="order-tabs">
            {tabs.map((item) => (
              <option key={item.value} value={item.code}>
                {item.label}
              </option>
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">Digite uma comanda nova ou existente.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">Itens do pedido</p>
          <button
            className="text-sm text-brand-700"
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, createEmptyItem()]
              }))
            }
          >
            + Adicionar item
          </button>
        </div>
        {form.items.map((item, index) => (
          <div key={`${index}-${item.productId}`} className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.55fr_1fr_auto]">
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={item.productId}
                onChange={(event) => updateItem(index, "productId", event.target.value)}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
              {findProduct(item.productId)?.isWeighable ? (
                <Input type="text" value={item.weightKg || "Aguardando leitura"} readOnly />
              ) : (
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, "quantity", event.target.value)}
                />
              )}
              <Input
                placeholder="Observacao do item"
                value={item.notes}
                onChange={(event) => updateItem(index, "notes", event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={form.items.length === 1}
                onClick={() => removeItem(index)}
              >
                Remover
              </Button>
            </div>
            {findProduct(item.productId)?.isWeighable && (
              <div className="space-y-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3">
                <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_0.9fr_auto]">
                  <select
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={item.scaleMode}
                    onChange={(event) => updateItem(index, "scaleMode", event.target.value as ScaleMode)}
                  >
                    <option value="MANUAL">Peso manual</option>
                    <option value="DEVICE">Ler da balanca</option>
                  </select>
                  {item.scaleMode === "DEVICE" ? (
                    <select
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      value={item.scaleDeviceId}
                      onChange={(event) => updateItem(index, "scaleDeviceId", event.target.value)}
                    >
                      {scaleDevices.map((device) => (
                        <option key={device.value} value={device.value}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Peso em kg"
                      value={item.weightKg}
                      onChange={(event) => updateItem(index, "weightKg", event.target.value)}
                    />
                  )}
                  <div className="rounded-lg bg-white px-3 py-3 text-sm text-slate-600">
                    {item.scaleMode === "DEVICE" ? "Captura preparada para serial, USB ou API." : "Fallback manual com auditoria."}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => captureWeight(index)}>
                    {item.scaleMode === "DEVICE" ? "Capturar peso" : "Registrar peso"}
                  </Button>
                </div>
                {item.readingSummary && (
                  <div className="rounded-lg bg-white px-3 py-2 text-sm text-emerald-700">
                    {item.readingSummary}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Itens por quilo entram no pedido ja vinculados a uma leitura, para mesa ou comanda.
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{findProduct(item.productId)?.typeLabel ?? "Item"}</span>
              <span>
                Subtotal:{" "}
                {(
                  (findProduct(item.productId)?.price ?? 0) *
                  (Number(findProduct(item.productId)?.isWeighable ? item.weightKg : item.quantity) || 0)
                ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Observacoes gerais</label>
        <Input
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">Previsao do pedido</span>
        <span className="font-semibold text-slate-900">
          {orderPreviewTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Salvar pedido"}
      </Button>
    </form>
  );
}
