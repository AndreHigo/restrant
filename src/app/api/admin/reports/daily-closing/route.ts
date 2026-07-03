import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { dailyCashClosingToCsv, listDailyCashClosing } from "@/lib/services/financial";

export async function GET(request: Request) {
  try {
    await requirePermission("financial.view");

    const url = new URL(request.url);
    const report = await listDailyCashClosing(url.searchParams.get("data") ?? undefined);

    return new Response(dailyCashClosingToCsv(report), {
      headers: {
        "Content-Disposition": `attachment; filename=fechamento-diario-${report.selectedDate}.csv`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
