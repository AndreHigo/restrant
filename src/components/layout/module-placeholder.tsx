import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({
  title,
  description,
  stage
}: {
  title: string;
  description: string;
  stage: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Badge tone="warning">{stage}</Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Estrutura de rota pronta para receber servicos, validacoes e tabelas do modulo.
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Layout consistente com o shell administrativo e operacional ja configurado.
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Esta tela sera aprofundada nas proximas fases com CRUD, filtros e relatorios.
        </div>
      </div>
    </div>
  );
}
