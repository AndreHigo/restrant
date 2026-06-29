import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { getPurchaseReport, purchaseReportToCsv } from "@/lib/services/reports";

export async function GET(request: Request) {
  try {
    await requirePermission("purchases.view");

    const url = new URL(request.url);
    const report = await getPurchaseReport({
      status: url.searchParams.get("status") ?? undefined,
      supplierId: url.searchParams.get("supplierId") ?? undefined
    });

    return new Response(purchaseReportToCsv(report), {
      headers: {
        "Content-Disposition": "attachment; filename=relatorio-compras.csv",
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
