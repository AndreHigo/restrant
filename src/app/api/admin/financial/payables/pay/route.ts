import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { payAccountPayableSchema } from "@/lib/validations/financial";
import { payAccountPayable } from "@/lib/services/financial";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("financial.pay");
    const body = await request.json();
    const parsed = payAccountPayableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const payable = await payAccountPayable(parsed.data, session.sub);
    return NextResponse.json(payable);
  } catch (error) {
    return handleApiError(error);
  }
}
