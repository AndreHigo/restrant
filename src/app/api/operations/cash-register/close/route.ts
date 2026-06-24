import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { closeCashRegister } from "@/lib/services/operations";
import { cashRegisterCloseSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cash.manage");
    const body = await request.json();
    const parsed = cashRegisterCloseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const register = await closeCashRegister(parsed.data, session.sub);
    return NextResponse.json(register);
  } catch (error) {
    return handleApiError(error);
  }
}
