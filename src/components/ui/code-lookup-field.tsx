"use client";

import { Search } from "lucide-react";
import type React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CodeLookupOption = {
  code?: string;
  keywords?: string;
  label: string;
  meta?: string;
  value: string;
};

type CodeLookupFieldProps = {
  disabled?: boolean;
  emptyLabel?: string;
  error?: boolean;
  helperText?: string;
  label?: string;
  maxSuggestions?: number;
  onChange: (value: string) => void;
  options: CodeLookupOption[];
  placeholder?: string;
  value: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function displayValue(option?: CodeLookupOption) {
  if (!option) {
    return "";
  }

  return option.code ? `${option.code} - ${option.label}` : option.label;
}

export function CodeLookupField({
  disabled = false,
  emptyLabel = "Nenhuma opcao encontrada",
  error = false,
  helperText,
  label,
  maxSuggestions = 6,
  onChange,
  options,
  placeholder = "Digite codigo ou nome",
  value
}: CodeLookupFieldProps) {
  const listId = useId();
  const optionViews = useMemo(
    () =>
      options.map((option) => {
        const display = displayValue(option);
        const normalizedSearch = [option.code, option.label, option.meta, option.keywords, display]
          .filter(Boolean)
          .map((item) => normalize(String(item)))
          .join(" ");

        return {
          display,
          normalizedSearch,
          option
        };
      }),
    [options]
  );
  const selectedOption = options.find((option) => option.value === value);
  const [query, setQuery] = useState(displayValue(selectedOption));

  useEffect(() => {
    setQuery(displayValue(selectedOption));
  }, [selectedOption?.value]);

  const filteredOptions = useMemo(
    () => {
      const normalizedQuery = normalize(query);

      if (!normalizedQuery) {
        return optionViews.slice(0, maxSuggestions);
      }

      return optionViews
        .filter(({ normalizedSearch }) => normalizedSearch.includes(normalizedQuery))
        .slice(0, maxSuggestions);
    },
    [maxSuggestions, optionViews, query]
  );

  function selectOption(option: CodeLookupOption) {
    setQuery(displayValue(option));
    onChange(option.value);
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery);

    const normalizedQuery = normalize(nextQuery);
    const exactOption = optionViews.find(({ display, option }) =>
      [option.code, option.label, display]
        .filter(Boolean)
        .some((item) => normalize(String(item)) === normalizedQuery)
    )?.option;

    if (exactOption) {
      onChange(exactOption.value);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || filteredOptions.length === 0) {
      return;
    }

    event.preventDefault();
    selectOption(filteredOptions[0].option);
  }

  return (
    <div>
      {label && <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className={cn(
            "h-11 pl-9",
            error && "border-red-300 focus:border-red-500 focus:ring-red-100"
          )}
          disabled={disabled}
          list={listId}
          placeholder={placeholder}
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <datalist id={listId}>
          {filteredOptions.map(({ display, option }) => (
            <option key={option.value} value={display}>
              {option.meta ?? option.label}
            </option>
          ))}
        </datalist>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(({ display, option }) => (
            <button
              key={option.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                option.value === value
                  ? "border-brand-200 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
              disabled={disabled}
              type="button"
              onClick={() => selectOption(option)}
            >
              {display}
            </button>
          ))
        ) : (
          <span className="rounded-full border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400">
            {emptyLabel}
          </span>
        )}
      </div>

      {(helperText || selectedOption?.meta) && (
        <p className="mt-2 text-xs text-slate-500">{helperText ?? selectedOption?.meta}</p>
      )}
    </div>
  );
}
