"use client";

import type React from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type QuickPosProduct = {
  code: string;
  id: string;
  isWeighable: boolean;
  name: string;
  price: number;
};

export function QuickPosCodeForm({
  defaultChannel = "TAB",
  initialTabCode = "",
  requireTab = true,
  products
}: {
  defaultChannel?: "COUNTER" | "TAB" | "TAKEOUT";
  initialTabCode?: string;
  requireTab?: boolean;
  products: QuickPosProduct[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabCode, setTabCode] = useState(initialTabCode.replace(/\D/g, ""));
  const [productSearch, setProductSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const productInputRef = useRef<HTMLInputElement>(null);

  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const productMatches = useMemo(() => {
    if (!normalizedProductSearch) {
      return [];
    }

    const digits = productSearch.replace(/\D/g, "");
    return products
      .filter((item) => {
        const codeMatches = digits ? item.code.includes(digits) : false;
        const nameMatches = item.name.toLowerCase().includes(normalizedProductSearch);
        return codeMatches || nameMatches;
      })
      .sort((first, second) => {
        const firstExactCode = first.code === digits ? 0 : 1;
        const secondExactCode = second.code === digits ? 0 : 1;
        const firstStartsWithName = first.name.toLowerCase().startsWith(normalizedProductSearch) ? 0 : 1;
        const secondStartsWithName = second.name.toLowerCase().startsWith(normalizedProductSearch) ? 0 : 1;
        return firstExactCode - secondExactCode || firstStartsWithName - secondStartsWithName || first.name.localeCompare(second.name);
      })
      .slice(0, 6);
  }, [normalizedProductSearch, productSearch, products]);
  const product = productMatches[0];
  const amount = product
    ? product.price * (product.isWeighable ? Number(weightKg) || 0 : Number(quantity) || 0)
    : 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanTabCode = tabCode.replace(/\D/g, "");
    const selectedProduct = product;

    if (requireTab && !cleanTabCode) {
      setError("Informe o numero da comanda.");
      return;
    }

    if (!selectedProduct) {
      setError("Produto nao encontrado. Digite o codigo ou parte do nome.");
      return;
    }

    const parsedQuantity = selectedProduct.isWeighable ? Number(weightKg) : Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      setError(selectedProduct.isWeighable ? "Informe o peso em kg." : "Informe uma quantidade valida.");
      return;
    }

    const channel = cleanTabCode ? "TAB" : defaultChannel;

    setIsSubmitting(true);
    const response = await fetch("/api/operations/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        tabCode: channel === "TAB" ? cleanTabCode : "",
        notes:
          channel === "COUNTER"
            ? "Atendimento rapido de balcao"
            : channel === "TAKEOUT"
              ? "Atendimento rapido de retirada"
              : "Lancamento pelo PDV rapido",
        items: [
          {
            productId: selectedProduct.id,
            quantity: parsedQuantity,
            weightKg: selectedProduct.isWeighable ? parsedQuantity : undefined,
            notes
          }
        ]
      })
    });
    const payload = (await response.json()) as { error?: string; appendedToExistingOrder?: boolean; number?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel lancar o item.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(
      channel === "TAB" && payload.appendedToExistingOrder
        ? `Item adicionado ao pedido ${payload.number ?? ""}.`.trim()
        : channel === "TAB"
          ? `Pedido ${payload.number ?? ""} criado para a comanda ${cleanTabCode}.`.trim()
          : `Pedido ${payload.number ?? ""} criado no ${channel === "COUNTER" ? "balcao" : "retirada"}.`.trim()
    );
    setProductSearch("");
    setQuantity("1");
    setWeightKg("");
    setNotes("");
    setIsSubmitting(false);
    window.setTimeout(() => productInputRef.current?.focus(), 0);
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-[0.8fr_0.8fr]">
        <div>
          <label className="mb-2 block text-[15px] font-medium text-slate-700">
            Comanda{requireTab ? "" : " opcional"}
          </label>
          <Input
            className="h-12 px-4 text-lg font-semibold"
            inputMode="numeric"
            placeholder={requireTab ? "25" : "Vazio = balcao"}
            value={tabCode}
            onChange={(event) => setTabCode(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div>
          <label className="mb-2 block text-[15px] font-medium text-slate-700">Produto</label>
          <Input
            ref={productInputRef}
            className="h-12 px-4 text-lg font-semibold"
            placeholder="Codigo ou nome. Ex.: 101, coca, marmita"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        {product ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">{product.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {product.isWeighable ? "Produto por quilo" : "Produto unitario"} -{" "}
                {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <p className="text-lg font-semibold text-slate-950">
              {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Digite o codigo ou parte do nome do produto. {requireTab ? "" : "Sem comanda, o lancamento abre um pedido de balcao."}
          </p>
        )}
      </div>

      {productMatches.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            Produtos encontrados
          </p>
          <div className="grid gap-1">
            {productMatches.map((item) => (
              <button
                key={item.id}
                className={`flex min-h-10 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                  product?.id === item.id ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"
                }`}
                type="button"
                onClick={() => {
                  setProductSearch(`${item.code} - ${item.name}`);
                  window.setTimeout(() => productInputRef.current?.focus(), 0);
                }}
              >
                <span className="font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{item.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
        {product?.isWeighable ? (
          <div>
            <label className="mb-2 block text-[15px] font-medium text-slate-700">Peso manual kg</label>
            <Input
              className="h-12 px-4 text-[15px]"
              min="0.001"
              step="0.001"
              type="number"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-[15px] font-medium text-slate-700">Quantidade</label>
            <Input
              className="h-12 px-4 text-[15px]"
              min="0.001"
              step="0.001"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        )}
        <div>
          <label className="mb-2 block text-[15px] font-medium text-slate-700">Observacao</label>
          <Input
            className="h-12 px-4 text-[15px]"
            placeholder="Sem cebola, marmita, extra..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Button className="h-12 w-full text-[15px]" disabled={isSubmitting || isPending} type="submit">
        {isSubmitting || isPending ? "Lancando..." : requireTab ? "Lancar item na comanda" : "Lancar atendimento rapido"}
      </Button>
    </form>
  );
}
