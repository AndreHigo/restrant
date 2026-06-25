import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { purchaseOrderSchema } from "@/lib/validations/purchases";
import { createPurchaseOrder, listPurchaseDashboard } from "@/lib/services/purchases";

export async function GET() {
  try {
    await requirePermission("purchases.view");
    return NextResponse.json(await listPurchaseDashboard());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("purchases.manage");
    const body = await request.json();
    const parsed = purchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const order = await createPurchaseOrder(parsed.data, session.sub);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
