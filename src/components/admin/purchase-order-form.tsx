"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type Option = {
  code?: string;
  keywords?: string;
  label: string;
  meta?: string;
  value: string;
};

type ReceivableOrder = Option & {
  detail: string;
  pendingQty: number;
};

type PurchaseSuggestion = {
  averageDailyConsumption: number;
  coverageDays: number | null;
  currentStock: number;
  ingredientId: string;
  ingredientName: string;
  minimumStock: number;
  sku: string;
  suggestedQuantity: number;
  targetStock: number;
  thirtyDayConsumption: number;
  unit: string;
  unitCost: number;
};

type OrderFormState = {
  supplierId: string;
  ingredientId: string;
  quantity: string;
  unitPrice: string;
  expectedAt: string;
  notes: string;
};

export function PurchaseOrderForm({
  canCreatePurchase,
  canReceivePurchase,
  suppliers,
  ingredients,
  receivableOrders,
  suggestions
}: {
  canCreatePurchase: boolean;
  canReceivePurchase: boolean;
  suppliers: Option[];
  ingredients: Option[];
  receivableOrders: ReceivableOrder[];
  suggestions: PurchaseSuggestion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OrderFormState, string>>>({});
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    supplierId: suppliers[0]?.value ?? "",
    ingredientId: ingredients[0]?.value ?? "",
    quantity: "1",
    unitPrice: formatCurrencyInput(0),
    expectedAt: "",
    notes: ""
  });
  const [receiptForm, setReceiptForm] = useState({
    purchaseOrderId: receivableOrders[0]?.value ?? "",
    receivedQuantity: receivableOrders[0]?.pendingQty ? String(receivableOrders[0].pendingQty) : ""
  });
  const selectedReceivableOrder = receivableOrders.find((order) => order.value === receiptForm.purchaseOrderId);

  useEffect(() => {
    if (
      receivableOrders.length > 0 &&
      !receivableOrders.some((order) => order.value === receiptForm.purchaseOrderId)
    ) {
      setReceiptForm({
        purchaseOrderId: receivableOrders[0].value,
        receivedQuantity: String(receivableOrders[0].pendingQty)
      });
    }
  }, [receivableOrders, receiptForm.purchaseOrderId]);

  function refresh(message: string) {
    setSuccess(message);
    setFieldErrors({});
    startTransition(() => router.refresh());
  }

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validateOrderForm()) {
      setError("Revise os campos destacados antes de criar o pedido.");
      return;
    }

    const response = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...orderForm,
        unitPrice: currencyToApiValue(orderForm.unitPrice)
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel criar o pedido de compra.");
      return;
    }

    refresh("Pedido de compra criado.");
  }

  function updateOrderField(field: keyof OrderFormState, value: string) {
    setOrderForm((current) => ({
      ...current,
      [field]: field === "unitPrice" ? formatCurrencyInput(value) : value
    }));

    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function applySuggestion(suggestion: PurchaseSuggestion) {
    const coverageNote =
      suggestion.coverageDays === null
        ? "sem consumo medio recente"
        : `${suggestion.coverageDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dia(s) de cobertura`;

    setOrderForm((current) => ({
      ...current,
      ingredientId: suggestion.ingredientId,
      notes: `Sugestao automatica: saldo ${formatQuantity(suggestion.currentStock, suggestion.unit)}, minimo ${formatQuantity(
        suggestion.minimumStock,
        suggestion.unit
      )}, alvo ${formatQuantity(suggestion.targetStock, suggestion.unit)}, ${coverageNote}.`,
      quantity: String(suggestion.suggestedQuantity),
      unitPrice: formatCurrencyInput(suggestion.unitCost)
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.ingredientId;
      delete next.quantity;
      delete next.unitPrice;
      return next;
    });
    setError("");
    setSuccess("Sugestao aplicada. Revise fornecedor, quantidade e custo antes de criar o pedido.");
  }

  function validateOrderForm() {
    const nextErrors: Partial<Record<keyof OrderFormState, string>> = {};

    if (!orderForm.supplierId) {
      nextErrors.supplierId = "Selecione o fornecedor.";
    }

    if (!orderForm.ingredientId) {
      nextErrors.ingredientId = "Selecione o insumo.";
    }

    const quantity = Number(orderForm.quantity);

    if (Number.isNaN(quantity) || quantity <= 0) {
      nextErrors.quantity = "Informe uma quantidade valida.";
    }

    const unitPrice = parseCurrencyInput(orderForm.unitPrice);

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      nextErrors.unitPrice = "Informe um custo valido.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function receiveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/purchases/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseOrderId: receiptForm.purchaseOrderId,
        receivedQuantity: receiptForm.receivedQuantity ? Number(receiptForm.receivedQuantity) : undefined
      })
    });
    const payload = (await response.json()) as {
      error?: string;
      payable?: { amount: number };
      receipt?: { totalReceivedAmount: number };
    };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel receber o pedido.");
      return;
    }

    const payableAmount = payload.payable?.amount ?? payload.receipt?.totalReceivedAmount ?? 0;
    refresh(
      payableAmount > 0
        ? `Pedido recebido, estoque atualizado e conta a pagar gerada em ${payableAmount.toLocaleString("pt-BR", {
            currency: "BRL",
            style: "currency"
          })}.`
        : "Pedido recebido e estoque atualizado."
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-amber-950">Sugestoes de compra</h4>
            <p className="mt-1 text-xs text-amber-800">
              Considera estoque minimo, consumo dos ultimos 30 dias e cobertura aproximada de 7 dias.
            </p>
          </div>
          <span className="text-xs font-medium text-amber-800">
            {suggestions.length} alerta{suggestions.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.ingredientId}
              className="rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{suggestion.ingredientName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Codigo {suggestion.sku} | saldo {formatQuantity(suggestion.currentStock, suggestion.unit)} | minimo{" "}
                    {formatQuantity(suggestion.minimumStock, suggestion.unit)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Consumo 30 dias {formatQuantity(suggestion.thirtyDayConsumption, suggestion.unit)} | media{" "}
                    {formatQuantity(suggestion.averageDailyConsumption, suggestion.unit)}/dia | cobertura{" "}
                    {suggestion.coverageDays === null
                      ? "-"
                      : `${suggestion.coverageDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dia(s)`}
                  </p>
                </div>
                <Button
                  className="h-9 shrink-0 px-3 text-xs"
                  type="button"
                  variant="secondary"
                  onClick={() => applySuggestion(suggestion)}
                >
                  Comprar {formatQuantity(suggestion.suggestedQuantity, suggestion.unit)}
                </Button>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm text-slate-500">
              Nenhum insumo com necessidade de reposicao agora.
            </div>
          )}
        </div>
      </section>

      {canCreatePurchase ? <form className="space-y-4" onSubmit={createOrder}>
        <div>
          <CodeLookupField
            error={Boolean(fieldErrors.supplierId)}
            label="Fornecedor"
            options={suppliers}
            placeholder="Digite CNPJ, CPF, fantasia ou razao social"
            value={orderForm.supplierId}
            onChange={(value) => updateOrderField("supplierId", value)}
          />
          {fieldErrors.supplierId && <FieldError message={fieldErrors.supplierId} />}
        </div>
        <div>
          <CodeLookupField
            error={Boolean(fieldErrors.ingredientId)}
            label="Insumo"
            options={ingredients}
            placeholder="Digite codigo ou nome do insumo"
            value={orderForm.ingredientId}
            onChange={(value) => updateOrderField("ingredientId", value)}
          />
          {fieldErrors.ingredientId && <FieldError message={fieldErrors.ingredientId} />}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Quantidade</label>
            <Input
              className={inputErrorClass(fieldErrors.quantity)}
              min="0"
              step="0.001"
              type="number"
              value={orderForm.quantity}
              onChange={(event) => updateOrderField("quantity", event.target.value)}
            />
            {fieldErrors.quantity && <FieldError message={fieldErrors.quantity} />}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Custo unitario</label>
            <Input
              className={inputErrorClass(fieldErrors.unitPrice)}
              inputMode="numeric"
              placeholder="R$ 0,00"
              type="text"
              value={orderForm.unitPrice}
              onChange={(event) => updateOrderField("unitPrice", event.target.value)}
            />
            {fieldErrors.unitPrice && <FieldError message={fieldErrors.unitPrice} />}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Previsao</label>
          <Input
            type="date"
            value={orderForm.expectedAt}
            onChange={(event) => updateOrderField("expectedAt", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Observacoes</label>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            value={orderForm.notes}
            onChange={(event) => updateOrderField("notes", event.target.value)}
          />
        </div>
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "Salvando..." : "Criar pedido de compra"}
        </Button>
      </form> : null}

      {canReceivePurchase ? <form className="rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={receiveOrder}>
        <h4 className="text-sm font-semibold text-slate-950">Receber pedido</h4>
        <p className="mt-1 text-xs text-slate-500">
          Informe a quantidade recebida para conferencia total ou parcial.
        </p>
        <div className="mt-4">
          <CodeLookupField
            disabled={receivableOrders.length === 0}
            emptyLabel="Nenhum pedido pendente"
            label="Pedido pendente"
            options={receivableOrders.map((order) => ({
              code: order.code,
              keywords: order.keywords,
              label: order.label,
              meta: order.detail,
              value: order.value
            }))}
            placeholder="Digite numero do pedido, fornecedor ou insumo"
            value={receiptForm.purchaseOrderId}
            onChange={(value) => {
              const order = receivableOrders.find((item) => item.value === value);
              setReceiptForm({
                purchaseOrderId: value,
                receivedQuantity: order?.pendingQty ? String(order.pendingQty) : ""
              });
            }}
          />
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Quantidade recebida
          <Input
            className="mt-2"
            disabled={receivableOrders.length === 0}
            max={selectedReceivableOrder?.pendingQty}
            min="0"
            step="0.001"
            type="number"
            value={receiptForm.receivedQuantity}
            onChange={(event) =>
              setReceiptForm((current) => ({ ...current, receivedQuantity: event.target.value }))
            }
          />
        </label>
        {selectedReceivableOrder && (
          <p className="mt-2 text-xs text-slate-500">
            Pendente: {selectedReceivableOrder.pendingQty.toLocaleString("pt-BR")} unidade(s) do pedido selecionado.
          </p>
        )}
        <Button className="mt-4 w-full" disabled={isPending || receivableOrders.length === 0} type="submit">
          {isPending ? "Recebendo..." : "Receber quantidade informada"}
        </Button>
      </form> : null}

      {!canCreatePurchase && !canReceivePurchase ? (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Seu perfil pode consultar compras, mas nao criar ou receber pedidos.
        </p>
      ) : null}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
    </div>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCurrencyInput(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number(onlyDigits(value)) / 100;

  if (Number.isNaN(numericValue)) {
    return "R$ 0,00";
  }

  return numericValue.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency"
  });
}

function parseCurrencyInput(value: string) {
  return Number((Number(onlyDigits(value)) / 100).toFixed(2));
}

function currencyToApiValue(value: string) {
  return String(parseCurrencyInput(value));
}

function formatQuantity(value: number, unit: string) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unit}`;
}

function inputErrorClass(message?: string) {
  return message ? "border-red-300 focus:border-red-500 focus:ring-red-100" : undefined;
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}
