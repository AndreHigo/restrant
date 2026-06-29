"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = {
  label: string;
  value: string;
};

type ReceivableOrder = Option & {
  detail: string;
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
  suppliers,
  ingredients,
  receivableOrders
}: {
  suppliers: Option[];
  ingredients: Option[];
  receivableOrders: ReceivableOrder[];
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
    purchaseOrderId: receivableOrders[0]?.value ?? ""
  });

  useEffect(() => {
    if (
      receivableOrders.length > 0 &&
      !receivableOrders.some((order) => order.value === receiptForm.purchaseOrderId)
    ) {
      setReceiptForm({ purchaseOrderId: receivableOrders[0].value });
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
      body: JSON.stringify(receiptForm)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel receber o pedido.");
      return;
    }

    refresh("Pedido recebido e estoque atualizado.");
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={createOrder}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Fornecedor</label>
          <select
            className={selectClassName(fieldErrors.supplierId)}
            value={orderForm.supplierId}
            onChange={(event) => updateOrderField("supplierId", event.target.value)}
          >
            {suppliers.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {fieldErrors.supplierId && <FieldError message={fieldErrors.supplierId} />}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Insumo</label>
          <select
            className={selectClassName(fieldErrors.ingredientId)}
            value={orderForm.ingredientId}
            onChange={(event) => updateOrderField("ingredientId", event.target.value)}
          >
            {ingredients.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
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
      </form>

      <form className="rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={receiveOrder}>
        <h4 className="text-sm font-semibold text-slate-950">Receber pedido</h4>
        <p className="mt-1 text-xs text-slate-500">
          O recebimento baixa a pendencia e gera entrada automatica no estoque.
        </p>
        <select
          className="mt-4 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          disabled={receivableOrders.length === 0}
          value={receiptForm.purchaseOrderId}
          onChange={(event) => setReceiptForm({ purchaseOrderId: event.target.value })}
        >
          {receivableOrders.length === 0 ? (
            <option value="">Nenhum pedido pendente</option>
          ) : (
            receivableOrders.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} - {item.detail}
              </option>
            ))
          )}
        </select>
        <Button className="mt-4 w-full" disabled={isPending || receivableOrders.length === 0} type="submit">
          {isPending ? "Recebendo..." : "Receber e atualizar estoque"}
        </Button>
      </form>

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

function inputErrorClass(message?: string) {
  return message ? "border-red-300 focus:border-red-500 focus:ring-red-100" : undefined;
}

function selectClassName(message?: string) {
  return `h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
    message
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
  }`;
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}
