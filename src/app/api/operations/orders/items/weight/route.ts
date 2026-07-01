import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { adjustWeighableSalesOrderItem } from "@/lib/services/operations";
import { orderItemWeightAdjustmentSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const body = await request.json();
    const parsed = orderItemWeightAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para ajustar o peso." },
        { status: 400 }
      );
    }

    const result = await adjustWeighableSalesOrderItem(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
