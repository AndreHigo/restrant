"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Power, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Option = {
  label: string;
  value: string;
};

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "textarea" | "date" | "select" | "checkbox";
  placeholder?: string;
  options?: Option[];
  step?: string;
};

type Column = {
  key: string;
  label: string;
  format?: "currency" | "badge";
  badgeMap?: Record<string, { label: string; tone: "default" | "success" | "warning" }>;
};

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

type StatusSummary = {
  active: number;
  inactive: number;
  all: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function ResourceManager({
  title,
  description,
  endpoint,
  fields,
  columns,
  items,
  accentLabel,
  initialValues
}: {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  columns: Column[];
  items: Array<Record<string, unknown>>;
  accentLabel: string;
  initialValues?: Record<string, string | boolean>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const createInitialState = () =>
    Object.fromEntries(
      fields.map((field) => {
        if (initialValues && field.name in initialValues) {
          return [field.name, initialValues[field.name]];
        }

        if (field.type === "checkbox") {
          return [field.name, false];
        }

        if (field.type === "select" && field.options?.length === 1) {
          return [field.name, field.options[0]?.value ?? ""];
        }

        return [field.name, ""];
      })
    ) as Record<string, string | boolean>;

  const [formState, setFormState] = useState<Record<string, string | boolean>>(createInitialState);

  const hasStatusControl = items.some((item) => getStatusAction(item) !== null);

  const statusSummary = useMemo(() => {
    return items.reduce<StatusSummary>(
      (summary, item) => {
        const action = getStatusAction(item);

        if (!action) {
          summary.all += 1;
          return summary;
        }

        const active = action.field === "active" ? item.active === true : item.status === "ACTIVE";

        if (active) {
          summary.active += 1;
        } else {
          summary.inactive += 1;
        }

        summary.all += 1;
        return summary;
      },
      { active: 0, inactive: 0, all: 0 }
    );
  }, [items]);

  const searchableKeys = useMemo(() => {
    return Array.from(new Set([...columns.map((column) => column.key), ...fields.map((field) => field.name)]));
  }, [columns, fields]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!hasStatusControl || statusFilter === "ALL") {
      return filterByQuery(items, normalizedQuery, searchableKeys);
    }

    const statusItems = items.filter((item) => {
      const action = getStatusAction(item);

      if (!action) {
        return true;
      }

      const active = action.field === "active" ? item.active === true : item.status === "ACTIVE";
      return statusFilter === "ACTIVE" ? active : !active;
    });

    return filterByQuery(statusItems, normalizedQuery, searchableKeys);
  }, [hasStatusControl, items, query, searchableKeys, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginationStart = visibleItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, visibleItems.length);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleItems.slice(start, start + pageSize);
  }, [currentPage, pageSize, visibleItems]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query, statusFilter]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  function getStatusAction(item: Record<string, unknown>) {
    if (typeof item.active === "boolean") {
      return {
        field: "active",
        label: item.active ? "Inativar" : "Ativar",
        nextValue: !item.active
      };
    }

    if (typeof item.status === "string" && ["ACTIVE", "INACTIVE", "ON_LEAVE"].includes(item.status)) {
      return {
        field: "status",
        label: item.status === "ACTIVE" ? "Inativar" : "Ativar",
        nextValue: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      };
    }

    return null;
  }

  function filterByQuery(
    currentItems: Array<Record<string, unknown>>,
    normalizedQuery: string,
    keys: string[]
  ) {
    if (!normalizedQuery) {
      return currentItems;
    }

    return currentItems.filter((item) =>
      keys.some((key) => {
        const value = item[key];

        if (value === null || value === undefined) {
          return false;
        }

        return String(value).toLowerCase().includes(normalizedQuery);
      })
    );
  }

  function itemToFormState(item: Record<string, unknown>) {
    return Object.fromEntries(
      fields.map((field) => {
        const value = item[field.name];

        if (field.type === "checkbox") {
          return [field.name, Boolean(value)];
        }

        if (value === null || value === undefined) {
          return [field.name, ""];
        }

        return [field.name, String(value)];
      })
    ) as Record<string, string | boolean>;
  }

  function renderCell(item: Record<string, unknown>, column: Column) {
    const value = item[column.key];

    if (column.format === "currency") {
      return typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
    }

    if (column.format === "badge") {
      const badgeKey =
        typeof value === "boolean" ? String(value) : value === null || value === undefined ? "" : String(value);
      const badgeConfig = column.badgeMap?.[badgeKey];

      if (!badgeConfig) {
        return <Badge tone="default">{badgeKey || "-"}</Badge>;
      }

      return <Badge tone={badgeConfig.tone}>{badgeConfig.label}</Badge>;
    }

    return String(value ?? "-");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch(editingItemId ? `${endpoint}/${editingItemId}` : endpoint, {
      method: editingItemId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formState)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel salvar o cadastro.");
      return;
    }

    setSuccess(editingItemId ? "Cadastro atualizado com sucesso." : "Cadastro salvo com sucesso.");
    setEditingItemId(null);
    startTransition(() => {
      router.refresh();
      setFormState(createInitialState());
    });
  }

  function startEdit(item: Record<string, unknown>) {
    const id = item.id;

    if (typeof id !== "string" || id.length === 0) {
      setError("Registro sem identificador para edicao.");
      return;
    }

    setError("");
    setSuccess("");
    setEditingItemId(id);
    setFormState(itemToFormState(item));
  }

  function cancelEdit() {
    setError("");
    setSuccess("");
    setEditingItemId(null);
    setFormState(createInitialState());
  }

  async function toggleStatus(item: Record<string, unknown>) {
    const id = item.id;
    const action = getStatusAction(item);

    if (typeof id !== "string" || id.length === 0 || !action) {
      setError("Registro sem status controlavel.");
      return;
    }

    setError("");
    setSuccess("");

    const response = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...itemToFormState(item),
        [action.field]: action.nextValue
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel alterar o status.");
      return;
    }

    setSuccess(action.nextValue === true || action.nextValue === "ACTIVE" ? "Cadastro ativado." : "Cadastro inativado.");
    setEditingItemId(null);
    setFormState(createInitialState());
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
              {hasStatusControl && (
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {[
                    { label: `Ativos ${statusSummary.active}`, value: "ACTIVE" },
                    { label: `Inativos ${statusSummary.inactive}`, value: "INACTIVE" },
                    { label: `Todos ${statusSummary.all}`, value: "ALL" }
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
              )}
              <form className="flex w-full gap-2 xl:w-96" onSubmit={(event) => event.preventDefault()}>
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder={`Pesquisar ${title.toLowerCase()}`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <Button className="shrink-0 px-3" type="submit" variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
              <div className="flex w-full justify-end">
                <Badge tone="success">{accentLabel}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em]">
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, index) => (
                <tr key={String(item.id ?? index)} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-[15px] text-slate-700">
                      {renderCell(item, column)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button className="h-9 px-3" type="button" variant="secondary" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {getStatusAction(item) && (
                        <Button className="h-9 px-3" type="button" variant="secondary" onClick={() => toggleStatus(item)}>
                          <Power className="h-4 w-4" />
                          {getStatusAction(item)?.label}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Exibindo {paginationStart}-{paginationEnd} de {visibleItems.length} registros
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Por pagina
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <Button
                className="h-9 px-3"
                disabled={currentPage <= 1}
                type="button"
                variant="secondary"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                {currentPage} / {pageCount}
              </span>
              <Button
                className="h-9 px-3"
                disabled={currentPage >= pageCount}
                type="button"
                variant="secondary"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Proxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            {editingItemId ? "Editar cadastro" : "Novo cadastro"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {editingItemId
              ? "Atualize os dados do registro selecionado com auditoria no backend."
              : "Inclusao rapida com validacao no frontend e backend."}
          </p>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-1" onSubmit={handleSubmit}>
          {fields.map((field) => {
            if (field.type === "textarea") {
              return (
                <div key={field.name} className="sm:col-span-2 2xl:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder={field.placeholder}
                    value={String(formState[field.name] ?? "")}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [field.name]: event.target.value
                      }))
                    }
                  />
                </div>
              );
            }

            if (field.type === "select") {
              return (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <select
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    value={String(formState[field.name] ?? "")}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [field.name]: event.target.value
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === "checkbox") {
              return (
                <label
                  key={field.name}
                  className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-[15px] font-medium text-slate-700"
                >
                  <input
                    className="h-5 w-5 accent-brand-700"
                    checked={Boolean(formState[field.name])}
                    type="checkbox"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [field.name]: event.target.checked
                      }))
                    }
                  />
                  <span>{field.label}</span>
                </label>
              );
            }

            return (
              <div key={field.name}>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <Input
                  step={field.step}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={String(formState[field.name] ?? "")}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      [field.name]: event.target.value
                    }))
                  }
                />
              </div>
            );
          })}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 2xl:col-span-1">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2 2xl:col-span-1">
              {success}
            </p>
          )}

          <Button className="h-12 w-full sm:col-span-2 2xl:col-span-1" disabled={isPending} type="submit">
            {isPending ? "Salvando..." : editingItemId ? "Atualizar cadastro" : "Salvar cadastro"}
          </Button>
          {editingItemId && (
            <Button className="h-11 w-full sm:col-span-2 2xl:col-span-1" type="button" variant="secondary" onClick={cancelEdit}>
              <X className="h-4 w-4" />
              Cancelar edicao
            </Button>
          )}
        </form>
      </section>
    </div>
  );
}
