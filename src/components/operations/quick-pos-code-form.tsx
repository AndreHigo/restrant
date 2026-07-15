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
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const productInputRef = useRef<HTMLInputElement>(null);

  const product = useMemo(
    () => products.find((item) => item.code === productCode),
    [productCode, products]
  );
  const amount = product
    ? product.price * (product.isWeighable ? Number(weightKg) || 0 : Number(quantity) || 0)
    : 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanTabCode = tabCode.replace(/\D/g, "");
    const cleanProductCode = productCode.replace(/\D/g, "");
    const selectedProduct = products.find((item) => item.code === cleanProductCode);

    if (requireTab && !cleanTabCode) {
      setError("Informe o numero da comanda.");
      return;
    }

    if (!selectedProduct) {
      setError("Produto nao encontrado para o codigo informado.");
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
    setProductCode("");
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
          <label className="mb-2 block text-[15px] font-medium text-slate-700">Codigo do produto</label>
          <Input
            ref={productInputRef}
            className="h-12 px-4 text-lg font-semibold"
            inputMode="numeric"
            placeholder="101"
            value={productCode}
            onChange={(event) => setProductCode(event.target.value.replace(/\D/g, ""))}
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
            Digite o codigo numerico para localizar o produto. {requireTab ? "" : "Sem comanda, o lancamento abre um pedido de balcao."}
          </p>
        )}
      </div>

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
