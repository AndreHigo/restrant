"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type Option = { label: string; value: string };
type LookupOption = Option & { code?: string; keywords?: string; meta?: string };
type TabOption = Option & { code: string };
type TableOption = Option & { code: string };
type ProductOption = {
  code: string;
  id: string;
  label: string;
  name: string;
  price: number;
  searchLabel: string;
  typeLabel: string;
  isWeighable: boolean;
};
type OrderChannel = "COUNTER" | "TABLE" | "TAB" | "TAKEOUT" | "DELIVERY" | "POS";
type ScaleMode = "MANUAL" | "DEVICE";
type OperationSettings = {
  enableCounter: boolean;
  enableDelivery: boolean;
  enableTableService: boolean;
  enableTakeout: boolean;
};
type OrderItemForm = {
  productId: string;
  productSearch: string;
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
  scaleDevices,
  initialTabCode = "",
  mode = "default",
  operationSettings = {
    enableCounter: true,
    enableDelivery: true,
    enableTableService: true,
    enableTakeout: true
  }
}: {
  customers: LookupOption[];
  tables: TableOption[];
  tabs: TabOption[];
  products: ProductOption[];
  scaleDevices: Option[];
  initialTabCode?: string;
  mode?: "default" | "waiter";
  operationSettings?: OperationSettings;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const initialTab = tabs.find((item) => item.code === initialTabCode);
  const defaultProductId = products.find((product) => !product.isWeighable)?.id ?? products[0]?.id ?? "";
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
    tabId: initialTab?.value ?? "",
    tabCode: initialTabCode,
    notes: "",
    items: [
      {
        productId: defaultProductId,
        productSearch: "",
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
  const selectedTab = tabs.find((item) => item.code === form.tabCode);
  const typedTabCode = form.tabCode.trim();
  const waiterMode = mode === "waiter";
  const submitLabel =
    waiterMode
      ? "Adicionar na comanda"
      : selectedChannel === "TAB"
      ? "Salvar na comanda"
      : selectedChannel === "TABLE"
        ? "Salvar na mesa"
        : "Salvar pedido";
  const channelOptions: Array<{ label: string; value: OrderChannel }> = [
    { label: "Comanda", value: "TAB" },
    ...(operationSettings.enableTableService ? [{ label: "Mesa", value: "TABLE" as const }] : []),
    ...(operationSettings.enableCounter
      ? [
          { label: "Balcao", value: "COUNTER" as const },
          { label: "PDV", value: "POS" as const }
        ]
      : []),
    ...(operationSettings.enableTakeout ? [{ label: "Retirada", value: "TAKEOUT" as const }] : []),
    ...(operationSettings.enableDelivery ? [{ label: "Delivery", value: "DELIVERY" as const }] : [])
  ];

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
      productId: productId ?? defaultProductId,
      productSearch: "",
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
      | "productSearch"
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
                productSearch: "",
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
    startTransition(() => {
      if (waiterMode) {
        router.push(`/operacao/garcom?comanda=${encodeURIComponent(form.tabCode.trim())}`);
        return;
      }

      router.refresh();
    });
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
    <form className="space-y-5" onSubmit={onSubmit}>
      {waiterMode ? (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Destino</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">Comanda {form.tabCode}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[15px] font-medium text-slate-700">Canal</label>
            <select
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
              {channelOptions.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Canais exibidos conforme os modos de operacao habilitados em Configuracoes.
            </p>
          </div>
          <div>
            <CodeLookupField
              disabled={selectedChannel === "TABLE" || selectedChannel === "TAB"}
              emptyLabel="Nenhum cliente encontrado"
              label="Cliente"
              options={[
                { label: "Nao informar", value: "" },
                ...customers
              ]}
              placeholder="Digite nome, CPF/CNPJ ou telefone"
              value={form.customerId}
              onChange={(value) => setForm((current) => ({ ...current, customerId: value }))}
            />
          </div>
        </div>
      )}

      {!waiterMode && <div className="grid gap-4 md:grid-cols-2">
        <div>
          <CodeLookupField
            disabled={selectedChannel !== "TABLE"}
            emptyLabel="Nenhuma mesa encontrada"
            label="Mesa"
            options={[
              { label: "Nao informar", value: "" },
              ...tables.map((item) => ({
                code: item.code,
                label: item.label,
                value: item.value
              }))
            ]}
            placeholder="Digite numero ou nome da mesa"
            value={form.tableId}
            onChange={(value) => setForm((current) => ({ ...current, tableId: value }))}
          />
        </div>
        <div>
          <label className="mb-2 block text-[15px] font-medium text-slate-700">Numero da comanda</label>
          <Input
            list="order-tabs"
            placeholder="Ex.: 25"
            className="h-12 px-4 text-[15px] disabled:bg-slate-50 disabled:text-slate-400"
            value={form.tabCode}
            onChange={(event) =>
              setForm((current) => {
                const nextCode = event.target.value.replace(/\D/g, "");
                const selectedTab = tabs.find((item) => item.code === nextCode);

                return {
                  ...current,
                  tabCode: nextCode,
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
          {selectedChannel === "TAB" && typedTabCode && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {selectedTab ? `Comanda existente: ${selectedTab.code}` : `Nova comanda: ${typedTabCode}`}
            </div>
          )}
        </div>
      </div>}

      <div className="space-y-3 rounded-lg border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] font-semibold text-slate-900">Itens do pedido</p>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 px-4 text-sm font-medium text-brand-800 transition hover:bg-brand-100"
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
            <CodeLookupField
              label="Produto"
              options={products.map((product) => ({
                code: product.code,
                keywords: product.searchLabel,
                label: product.label,
                meta: `${product.typeLabel} - ${product.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })}`,
                value: product.id
              }))}
              placeholder={waiterMode ? "Digite codigo numerico ou nome do item" : "Digite codigo, nome, categoria ou preco"}
              value={item.productId}
              onChange={(value) => updateItem(index, "productId", value)}
            />
            <div className="grid gap-3 2xl:grid-cols-[1.4fr_0.55fr_1fr_auto]">
              {findProduct(item.productId)?.isWeighable ? (
                <Input className="h-12 px-4 text-[15px]" type="text" value={item.weightKg || "Aguardando leitura"} readOnly />
              ) : (
                <Input
                  className="h-12 px-4 text-[15px]"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, "quantity", event.target.value)}
                />
              )}
              <Input
                className="h-12 px-4 text-[15px]"
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
                <div className="grid gap-3 2xl:grid-cols-[0.8fr_1fr_0.9fr_auto]">
                  <select
                    className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    value={item.scaleMode}
                    onChange={(event) => updateItem(index, "scaleMode", event.target.value as ScaleMode)}
                  >
                    <option value="MANUAL">Peso manual</option>
                    <option value="DEVICE">Ler da balanca</option>
                  </select>
                  {item.scaleMode === "DEVICE" ? (
                    <select
                      className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                      className="h-12 px-4 text-[15px]"
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Peso em kg"
                      value={item.weightKg}
                      onChange={(event) => updateItem(index, "weightKg", event.target.value)}
                    />
                  )}
                  <div className="rounded-lg bg-white px-3 py-3 text-sm leading-6 text-slate-600">
                    {item.scaleMode === "DEVICE" ? "Captura preparada para serial, USB ou API." : "Fallback manual com auditoria."}
                  </div>
                  <Button className="h-12" type="button" variant="secondary" onClick={() => captureWeight(index)}>
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

      {!waiterMode && <div>
        <label className="mb-2 block text-[15px] font-medium text-slate-700">Observacoes gerais</label>
        <Input
          className="h-12 px-4 text-[15px]"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-[15px]">
        <span className="text-slate-500">Previsao do pedido</span>
        <span className="font-semibold text-slate-900">
          {orderPreviewTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>

      <Button className="h-12 w-full text-[15px]" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
