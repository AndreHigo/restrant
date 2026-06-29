import { requirePermission } from "@/lib/auth";
import { getSalesReport, salesReportToCsv } from "@/lib/services/reports";

export async function GET(request: Request) {
  await requirePermission("dashboard.view");

  const url = new URL(request.url);
  const report = await getSalesReport({
    channel: url.searchParams.get("channel") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    status: url.searchParams.get("status") ?? undefined
  });

  const csv = salesReportToCsv(report);

  return new Response(csv, {
    headers: {
      "Content-Disposition": "attachment; filename=relatorio-vendas.csv",
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
