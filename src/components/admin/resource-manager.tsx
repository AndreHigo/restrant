"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

    const response = await fetch(endpoint, {
      method: "POST",
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

    setSuccess("Cadastro salvo com sucesso.");
    startTransition(() => {
      router.refresh();
      setFormState(createInitialState());
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <Badge tone="success">{accentLabel}</Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-6 py-3 font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={String(item.id ?? index)} className="border-t border-slate-100">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-slate-600">
                      {renderCell(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Novo cadastro</h3>
          <p className="mt-1 text-sm text-slate-500">
            Inclusao rapida com validacao no frontend e backend.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {fields.map((field) => {
            if (field.type === "textarea") {
              return (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <input
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

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          )}

          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "Salvando..." : "Salvar cadastro"}
          </Button>
        </form>
      </section>
    </div>
  );
}
