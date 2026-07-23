import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { purchaseReceiptSchema } from "@/lib/validations/purchases";
import { receivePurchaseOrder } from "@/lib/services/purchases";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("purchases.receive");
    const body = await request.json();
    const parsed = purchaseReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const order = await receivePurchaseOrder(parsed.data, session.sub);
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
