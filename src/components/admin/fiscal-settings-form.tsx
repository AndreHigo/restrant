"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CompanyFiscalSettings = {
  legalName: string;
  tradeName: string;
  document: string;
  stateTaxId: string;
  cityTaxId: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  fiscalEnvironment: string;
  fiscalIntegrationMode: string;
  fiscalWebserviceUf: string;
  nfceSeries: string;
  nfceNextNumber: number;
  nfceCscId: string;
  nfceCscToken: string;
  fiscalCertificateName: string;
};

const emptyCompany: CompanyFiscalSettings = {
  legalName: "",
  tradeName: "",
  document: "",
  stateTaxId: "",
  cityTaxId: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "TO",
  zipCode: "",
  fiscalEnvironment: "homologacao",
  fiscalIntegrationMode: "SVRS_DIRECT",
  fiscalWebserviceUf: "TO",
  nfceSeries: "1",
  nfceNextNumber: 1,
  nfceCscId: "",
  nfceCscToken: "",
  fiscalCertificateName: ""
};

type Field = {
  name: keyof CompanyFiscalSettings;
  label: string;
  placeholder?: string;
  required?: boolean;
};

const fields: Field[] = [
  { name: "legalName", label: "Razao social", required: true },
  { name: "tradeName", label: "Nome fantasia", required: true },
  { name: "document", label: "CNPJ", placeholder: "00.000.000/0000-00", required: true },
  { name: "stateTaxId", label: "Inscricao estadual" },
  { name: "cityTaxId", label: "Inscricao municipal" },
  { name: "email", label: "E-mail fiscal" },
  { name: "phone", label: "Telefone" },
  { name: "addressLine", label: "Endereco" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF", required: true },
  { name: "zipCode", label: "CEP", placeholder: "00000-000" }
];

const nfceFields: Field[] = [
  { name: "fiscalWebserviceUf", label: "UF autorizadora", placeholder: "TO", required: true },
  { name: "nfceSeries", label: "Serie NFC-e", placeholder: "1", required: true },
  { name: "nfceNextNumber", label: "Proximo numero NFC-e", placeholder: "1", required: true },
  { name: "nfceCscId", label: "ID CSC homologacao", placeholder: "Ex.: 000001" },
  { name: "nfceCscToken", label: "CSC homologacao", placeholder: "Codigo de 16 caracteres" },
  { name: "fiscalCertificateName", label: "Certificado A1", placeholder: "Nome/arquivo .pfx configurado no servidor" }
];

export function FiscalSettingsForm({ company }: { company: CompanyFiscalSettings | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CompanyFiscalSettings>(company ?? emptyCompany);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(name: keyof CompanyFiscalSettings, value: string) {
    setForm((current) => ({
      ...current,
      [name]:
        name === "state" || name === "fiscalWebserviceUf"
          ? value.toUpperCase().slice(0, 2)
          : name === "nfceNextNumber"
            ? Number(value || 1)
            : value
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/fiscal/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel salvar a configuracao fiscal.");
      return;
    }

    setSuccess("Configuracao fiscal atualizada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block text-sm font-medium text-slate-700">
            {field.label}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              maxLength={field.name === "state" ? 2 : 160}
              placeholder={field.placeholder}
              required={field.required}
              value={form[field.name]}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
          </label>
        ))}

        <label className="block text-sm font-medium text-slate-700">
          Ambiente fiscal
          <select
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            value={form.fiscalEnvironment}
            onChange={(event) => updateField("fiscalEnvironment", event.target.value)}
          >
            <option value="homologacao">Homologacao</option>
            <option value="producao">Producao</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">Homologacao NFC-e Tocantins</p>
          <p className="mt-1 text-sm text-slate-500">
            Parametros para preparar emissao modelo 65 usando autorizador SVRS.
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Modo de integracao
            <select
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              value={form.fiscalIntegrationMode}
              onChange={(event) => updateField("fiscalIntegrationMode", event.target.value)}
            >
              <option value="SVRS_DIRECT">SEFAZ/SVRS direta</option>
              <option value="PROVIDER">Provedor fiscal</option>
            </select>
          </label>
          {nfceFields.map((field) => (
            <label key={field.name} className="block text-sm font-medium text-slate-700">
              {field.label}
              <input
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                placeholder={field.placeholder}
                required={field.required}
                type={field.name === "nfceNextNumber" ? "number" : "text"}
                value={form[field.name]}
                onChange={(event) => updateField(field.name, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Button disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Salvar configuracao fiscal"}
      </Button>
    </form>
  );
}
