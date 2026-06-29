import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { getMarginReport, marginReportToCsv } from "@/lib/services/reports";

export async function GET(request: Request) {
  try {
    await requirePermission("dashboard.view");

    const url = new URL(request.url);
    const report = await getMarginReport({
      end: url.searchParams.get("end") ?? undefined,
      start: url.searchParams.get("start") ?? undefined
    });

    return new Response(marginReportToCsv(report), {
      headers: {
        "Content-Disposition": "attachment; filename=relatorio-margem-cmv.csv",
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
