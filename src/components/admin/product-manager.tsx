"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Barcode, Calculator, PackageCheck, Pencil, Plus, Power, Search, Scale, Tags, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductType = "READY" | "WEIGHABLE" | "INGREDIENT";

type Option = {
  label: string;
  value: string;
};

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  type: ProductType;
  category: string;
  categoryId: string;
  price: number | null;
  cost: number | null;
  pricePerKg: number | null;
  unit: string;
  active: boolean;
  trackStock: boolean;
  fiscalNcm: string;
  fiscalCfop: string;
  fiscalCest: string;
  stockQuantity: number | null;
  recipeItemsCount: number;
  saleItemsCount: number;
  margin: number | null;
  fiscalConfigured: boolean;
  sellable: boolean;
};

type FormState = {
  sku: string;
  name: string;
  description: string;
  type: ProductType;
  categoryId: string;
  price: string;
  cost: string;
  pricePerKg: string;
  unit: string;
  fiscalNcm: string;
  fiscalCfop: string;
  fiscalCest: string;
  active: boolean;
  trackStock: boolean;
};

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

const productTypeLabels: Record<ProductType, string> = {
  INGREDIENT: "Insumo vinculado",
  READY: "Pronto",
  WEIGHABLE: "Por quilo"
};

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quantity(value: number | null | undefined, unit: string) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3
  })} ${unit}`;
}

function createInitialFormState(categories: Option[]): FormState {
  return {
    sku: "",
    name: "",
    description: "",
    type: "READY",
    categoryId: categories[0]?.value ?? "",
    price: "0",
    cost: "0",
    pricePerKg: "",
    unit: "UN",
    fiscalNcm: "",
    fiscalCfop: "",
    fiscalCest: "",
    active: true,
    trackStock: true
  };
}

function productToFormState(product: ProductListItem): FormState {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    type: product.type,
    categoryId: product.categoryId,
    price: String(product.price ?? 0),
    cost: String(product.cost ?? 0),
    pricePerKg: product.pricePerKg === null ? "" : String(product.pricePerKg),
    unit: product.unit,
    fiscalNcm: product.fiscalNcm,
    fiscalCfop: product.fiscalCfop,
    fiscalCest: product.fiscalCest,
    active: product.active,
    trackStock: product.trackStock
  };
}

function getStatus(product: ProductListItem) {
  if (!product.active) {
    return { label: "Inativo", className: "border-slate-200 bg-slate-50 text-slate-600" };
  }

  if (!product.sellable) {
    return { label: "Revisar preco", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }

  if (!product.fiscalConfigured) {
    return { label: "Fiscal pendente", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }

  return { label: "Ativo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

export function ProductManager({
  categories,
  initialQuery,
  items
}: {
  categories: Option[];
  initialQuery: string;
  items: ProductListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState(categories));
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const summary = useMemo(
    () => ({
      active: items.filter((item) => item.active).length,
      inactive: items.filter((item) => !item.active).length,
      all: items.length,
      weighable: items.filter((item) => item.type === "WEIGHABLE").length,
      withRecipe: items.filter((item) => item.recipeItemsCount > 0).length,
      fiscalPending: items.filter((item) => item.active && !item.fiscalConfigured).length
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const statusFilteredItems = items.filter((item) => {
      if (statusFilter === "ALL") {
        return true;
      }

      return statusFilter === "ACTIVE" ? item.active : !item.active;
    });

    if (!normalizedQuery) {
      return statusFilteredItems;
    }

    return statusFilteredItems.filter((item) =>
      [item.name, item.sku, item.category, productTypeLabels[item.type]]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [items, query, statusFilter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      ...formState,
      pricePerKg: formState.type === "WEIGHABLE" ? formState.pricePerKg || formState.price || "0" : ""
    };
    const response = await fetch(
      editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products",
      {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel salvar o produto.");
      return;
    }

    setSuccess(editingProductId ? "Produto atualizado com sucesso." : "Produto salvo com sucesso.");
    setEditingProductId(null);
    setFormState(createInitialFormState(categories));
    startTransition(() => router.refresh());
  }

  function startEdit(product: ProductListItem) {
    setError("");
    setSuccess("");
    setEditingProductId(product.id);
    setFormState(productToFormState(product));
  }

  function cancelEdit() {
    setError("");
    setSuccess("");
    setEditingProductId(null);
    setFormState(createInitialFormState(categories));
  }

  async function toggleProductActive(product: ProductListItem) {
    setError("");
    setSuccess("");

    const productState = productToFormState(product);
    const payload = {
      ...productState,
      active: !product.active,
      pricePerKg:
        productState.type === "WEIGHABLE" ? productState.pricePerKg || productState.price || "0" : ""
    };

    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel alterar o status do produto.");
      return;
    }

    setSuccess(product.active ? "Produto inativado." : "Produto ativado.");
    setEditingProductId(null);
    setFormState(createInitialFormState(categories));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Produtos ativos</p>
            <PackageCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.active}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Venda por quilo</p>
            <Scale className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.weighable}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Com ficha tecnica</p>
            <Calculator className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.withRecipe}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Fiscal pendente</p>
            <Barcode className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.fiscalPending}</p>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Produtos</h3>
                  <Badge tone="success">PDV, balanca e fiscal</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Cadastro comercial dos itens vendidos. Produtos por quilo alimentam o fluxo da balanca.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {[
                    { label: `Ativos ${summary.active}`, value: "ACTIVE" },
                    { label: `Inativos ${summary.inactive}`, value: "INACTIVE" },
                    { label: `Todos ${summary.all}`, value: "ALL" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
                        statusFilter === option.value
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                      type="button"
                      onClick={() => setStatusFilter(option.value as StatusFilter)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <form action="/admin/produtos" className="flex w-full gap-2 xl:w-96">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      name="q"
                      placeholder="Buscar produto"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onInput={(event) => setQuery(event.currentTarget.value)}
                    />
                  </label>
                  <Button className="shrink-0 px-3" type="submit" variant="secondary">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Preco</th>
                  <th className="px-4 py-3 font-semibold">Estoque/ficha</th>
                  <th className="px-4 py-3 font-semibold">Fiscal</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((product) => {
                  const status = getStatus(product);
                  const priceLabel =
                    product.type === "WEIGHABLE" ? `${money(product.pricePerKg)}/kg` : money(product.price);

                  return (
                    <tr key={product.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-950">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.sku} - {product.category}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p className="font-medium text-slate-900">{productTypeLabels[product.type]}</p>
                        <p className="mt-1 text-xs text-slate-500">{product.unit}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p className="font-medium text-slate-900">{priceLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Custo {money(product.cost)}
                          {product.margin === null ? "" : ` - margem ${product.margin}%`}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{product.trackStock ? quantity(product.stockQuantity, product.unit) : "Sem controle"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.recipeItemsCount > 0
                            ? `${product.recipeItemsCount} insumo(s)`
                            : "Sem ficha tecnica"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{product.fiscalConfigured ? product.fiscalNcm : "Pendente"}</p>
                        <p className="mt-1 text-xs text-slate-500">{product.fiscalCfop || "CFOP pendente"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="h-9 px-3"
                            type="button"
                            variant="secondary"
                            onClick={() => startEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            className="h-9 px-3"
                            type="button"
                            variant="secondary"
                            onClick={() => toggleProductActive(product)}
                          >
                            <Power className="h-4 w-4" />
                            {product.active ? "Inativar" : "Ativar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                      Nenhum produto encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingProductId ? "Editar produto" : "Novo produto"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {editingProductId
                  ? "Atualize dados comerciais, fiscais e operacionais do produto."
                  : "Cadastre itens de venda unitarios ou por quilo para uso no PDV e na balanca."}
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">SKU</span>
                <Input
                  placeholder="PRO-100"
                  value={formState.sku}
                  onChange={(event) => setFormState((current) => ({ ...current, sku: event.target.value }))}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Unidade</span>
                <Input
                  placeholder="UN ou KG"
                  value={formState.unit}
                  onChange={(event) => setFormState((current) => ({ ...current, unit: event.target.value }))}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nome do produto</span>
              <Input
                placeholder="Prato da casa"
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Descricao operacional</span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Descricao usada pela equipe"
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-semibold text-slate-900">Venda</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Tipo</span>
                  <select
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        type: event.target.value as ProductType,
                        unit: event.target.value === "WEIGHABLE" ? "KG" : current.unit
                      }))
                    }
                  >
                    <option value="READY">Pronto</option>
                    <option value="WEIGHABLE">Por quilo</option>
                    <option value="INGREDIENT">Insumo vinculado</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Categoria</span>
                  <select
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    value={formState.categoryId}
                    onChange={(event) => setFormState((current) => ({ ...current, categoryId: event.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Preco unitario</span>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={formState.price}
                    onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Custo</span>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={formState.cost}
                    onChange={(event) => setFormState((current) => ({ ...current, cost: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Preco por kg</span>
                  <Input
                    min="0"
                    step="0.001"
                    type="number"
                    value={formState.pricePerKg}
                    onChange={(event) => setFormState((current) => ({ ...current, pricePerKg: event.target.value }))}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                  <input
                    checked={formState.trackStock}
                    className="h-5 w-5 accent-brand-700"
                    type="checkbox"
                    onChange={(event) => setFormState((current) => ({ ...current, trackStock: event.target.checked }))}
                  />
                  Controla estoque
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Fiscal</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">NCM</span>
                  <Input
                    placeholder="0000.00.00"
                    value={formState.fiscalNcm}
                    onChange={(event) => setFormState((current) => ({ ...current, fiscalNcm: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">CFOP</span>
                  <Input
                    placeholder="5102"
                    value={formState.fiscalCfop}
                    onChange={(event) => setFormState((current) => ({ ...current, fiscalCfop: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">CEST</span>
                  <Input
                    placeholder="00.000.00"
                    value={formState.fiscalCest}
                    onChange={(event) => setFormState((current) => ({ ...current, fiscalCest: event.target.value }))}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                  <input
                    checked={formState.active}
                    className="h-5 w-5 accent-brand-700"
                    type="checkbox"
                    onChange={(event) => setFormState((current) => ({ ...current, active: event.target.checked }))}
                  />
                  Produto ativo
                </label>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

            <Button className="h-12 w-full" disabled={isPending} type="submit">
              {isPending ? "Salvando..." : editingProductId ? "Atualizar produto" : "Salvar produto"}
            </Button>
            {editingProductId && (
              <Button className="h-11 w-full" type="button" variant="secondary" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancelar edicao
              </Button>
            )}
          </form>
        </aside>
      </section>
    </div>
  );
}
