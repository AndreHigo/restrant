"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PendingFiscalOrder = {
  id: string;
  number: string;
  customerLabel: string;
  total: number;
  closedAt: string;
  itemsCount: number;
  fiscalReady: boolean;
  paymentMethods: string;
};

type FiscalReadiness = {
  authorizationService: string;
  authorizationUrl: string;
  eventUrl: string;
  returnAuthorizationUrl: string;
  statusServiceUrl: string;
  canPrepareHomologationDraft: boolean;
  canTransmitToSefaz: boolean;
  cscConfigured: boolean;
  certificateConfigured: boolean;
  missing: string[];
};

type PreparedNfce = {
  accessKey?: string;
  error?: string;
  number?: string;
  readyToTransmit?: boolean;
  series?: string;
  signatureStatus?: string;
  status?: string;
  xmlGenerated?: boolean;
};

type StatusCheck = {
  checkedAt?: string;
  environment?: string;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
  latencyMs?: number;
  protectedBySefaz?: boolean;
  reachable?: boolean;
  statusServiceUrl?: string;
  tlsIssue?: boolean;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function NfceHomologationPanel({
  pendingOrders,
  readiness
}: {
  pendingOrders: PendingFiscalOrder[];
  readiness: FiscalReadiness;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOrderId, setSelectedOrderId] = useState(pendingOrders[0]?.id ?? "");
  const [result, setResult] = useState<PreparedNfce | null>(null);
  const [statusCheck, setStatusCheck] = useState<StatusCheck | null>(null);

  async function prepareNfce() {
    setResult(null);

    const response = await fetch("/api/admin/fiscal/nfce/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        salesOrderId: selectedOrderId
      })
    });
    const payload = (await response.json()) as PreparedNfce;

    if (!response.ok) {
      setResult({
        error: payload.error ?? "Nao foi possivel preparar a NFC-e."
      });
      return;
    }

    setResult(payload);
    startTransition(() => router.refresh());
  }

  async function checkStatusService() {
    setStatusCheck(null);

    const response = await fetch("/api/admin/fiscal/nfce/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        environment: "homologacao"
      })
    });
    const payload = (await response.json()) as StatusCheck;

    if (!response.ok) {
      setStatusCheck({
        error: payload.error ?? "Nao foi possivel consultar o status da SVRS."
      });
      return;
    }

    setStatusCheck(payload);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Teste de emissao NFC-e em homologacao</h3>
            <p className="mt-1 text-sm text-slate-500">
              Preparacao para Tocantins usando autorizador SVRS. O envio externo fica bloqueado ate configurar CSC e certificado.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              XML gerado localmente antes da assinatura digital e transmissao.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Depois da assinatura, transmita para a SVRS. Se a SEFAZ devolver recibo, consulte o recibo para buscar o protocolo.
            </p>
          </div>
          <span
            className={
              readiness.canTransmitToSefaz
                ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                : "inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
            }
          >
            {readiness.canTransmitToSefaz ? "Pronto para transmitir" : "Pre-emissao"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Base de homologacao</p>
            <p className="mt-2 text-sm text-slate-600">
              {readiness.authorizationService} - {readiness.statusServiceUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={checkStatusService}>
                Testar homologacao SVRS
              </Button>
            </div>
            {statusCheck && (
              <div
                className={
                  statusCheck.reachable
                    ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                    : "mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                }
              >
                {statusCheck.error
                  ? statusCheck.tlsIssue
                    ? "URL oficial localizada, mas o Node local nao confiou na cadeia TLS. Configure a cadeia de certificados ou rode o teste no ambiente do servidor fiscal."
                    : statusCheck.error
                  : statusCheck.protectedBySefaz
                    ? `SVRS respondeu HTTP ${statusCheck.httpStatus}. Acesso protegido, esperado antes do certificado fiscal.`
                    : statusCheck.reachable
                    ? `Homologacao acessivel. HTTP ${statusCheck.httpStatus} em ${statusCheck.latencyMs} ms.`
                    : `Homologacao nao confirmada. HTTP ${statusCheck.httpStatus}.`}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">CSC homologacao</p>
              <p className="mt-2 font-semibold text-slate-950">
                {readiness.cscConfigured ? "Configurado" : "Pendente"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Certificado A1</p>
              <p className="mt-2 font-semibold text-slate-950">
                {readiness.certificateConfigured ? "Referenciado" : "Pendente"}
              </p>
            </div>
          </div>

          {readiness.missing.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Faltando para envio real</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {readiness.missing.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Configuracao minima pronta para transmitir para homologacao.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Venda paga sem documento fiscal
            <select
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              disabled={pendingOrders.length === 0}
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
            >
              {pendingOrders.length === 0 ? (
                <option value="">Nenhuma venda pendente</option>
              ) : (
                pendingOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.number} - {order.customerLabel} - {formatCurrency(order.total)}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-950">Vendas disponiveis</p>
            </div>
            <div className="max-h-64 divide-y divide-slate-100 overflow-auto">
              {pendingOrders.length > 0 ? (
                pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{order.number}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.customerLabel} - {order.itemsCount} item(ns) - {order.paymentMethods}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-950">{formatCurrency(order.total)}</p>
                    </div>
                    {!order.fiscalReady && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Produto sem fiscal completo. Revise NCM/CFOP antes de preparar.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-slate-500">
                  Nenhuma venda paga pendente de NFC-e no momento.
                </div>
              )}
            </div>
          </div>

          {result?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{result.error}</p>}
          {result && !result.error && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              NFC-e {result.series}/{result.number} preparada em {result.status}. XML{" "}
              {result.xmlGenerated ? "gerado" : "pendente"} para assinatura digital. Chave: {result.accessKey}
            </div>
          )}

          <Button
            disabled={!selectedOrderId || isPending || !readiness.canPrepareHomologationDraft}
            type="button"
            onClick={prepareNfce}
          >
            {isPending ? "Preparando..." : "Preparar NFC-e de homologacao"}
          </Button>
        </div>
      </div>
    </section>
  );
}
