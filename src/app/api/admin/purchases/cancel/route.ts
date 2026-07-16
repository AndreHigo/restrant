import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { cancelPurchaseOrder } from "@/lib/services/purchases";
import { purchaseCancelSchema } from "@/lib/validations/purchases";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("purchases.manage");
    const body = await request.json();
    const parsed = purchaseCancelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const order = await cancelPurchaseOrder(parsed.data, session.sub);
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
