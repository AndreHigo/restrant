import { requirePermission } from "@/lib/auth";
import { getStockReport, stockReportToCsv } from "@/lib/services/reports";

export async function GET(request: Request) {
  await requirePermission("stock.view");

  const url = new URL(request.url);
  const report = await getStockReport({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined
  });

  return new Response(stockReportToCsv(report), {
    headers: {
      "Content-Disposition": "attachment; filename=relatorio-estoque.csv",
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
