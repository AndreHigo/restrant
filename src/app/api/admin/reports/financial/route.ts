import { requirePermission } from "@/lib/auth";
import { financialReportToCsv, getFinancialReport } from "@/lib/services/reports";

export async function GET(request: Request) {
  await requirePermission("financial.view");

  const url = new URL(request.url);
  const report = await getFinancialReport({
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined
  });

  return new Response(financialReportToCsv(report), {
    headers: {
      "Content-Disposition": "attachment; filename=relatorio-financeiro.csv",
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
