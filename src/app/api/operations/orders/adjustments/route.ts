import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateSalesOrderAdjustments } from "@/lib/services/operations";
import { orderAdjustmentSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const body = await request.json();
    const parsed = orderAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para ajustar o pedido." },
        { status: 400 }
      );
    }

    const result = await updateSalesOrderAdjustments(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
