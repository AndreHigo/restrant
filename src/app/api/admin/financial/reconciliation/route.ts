import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { reconcilePaymentMethod } from "@/lib/services/financial";
import { paymentMethodReconciliationSchema } from "@/lib/validations/financial";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("financial.reconcile");
    const body = await request.json();
    const parsed = paymentMethodReconciliationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para conciliacao." },
        { status: 400 }
      );
    }

    const reconciliation = await reconcilePaymentMethod(parsed.data, session.sub);
    return NextResponse.json(reconciliation);
  } catch (error) {
    return handleApiError(error);
  }
}
