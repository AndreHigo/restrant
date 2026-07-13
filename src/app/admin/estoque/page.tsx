import { requirePagePermission } from "@/lib/auth";
import { StockManager } from "@/components/admin/stock-manager";
import { ContextualReportLinks } from "@/components/reports/contextual-report-links";
import { listStockOverview } from "@/lib/services/stock";

export default async function AdminStockPage() {
  await requirePagePermission("stock.view");
  const overview = await listStockOverview();

  return (
    <div className="space-y-6">
      <ContextualReportLinks
        title="Relatorios de estoque"
        description="Analise saldos, alertas, CMV e perdas a partir da operacao de estoque."
        links={[
          {
            title: "Relatorio de estoque",
            description: "Saldos, estoque minimo, validade e movimentacoes recentes.",
            href: "/admin/relatorios/estoque",
            exportHref: "/api/admin/reports/stock"
          },
          {
            title: "Margem, CMV e desperdicio",
            description: "Cruza vendas, ficha tecnica, consumo e perdas registradas.",
            href: "/admin/relatorios/margem",
            exportHref: "/api/admin/reports/margins"
          }
        ]}
      />
      <StockManager overview={overview} />
    </div>
  );
}
