import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { openCashRegister } from "@/lib/services/operations";
import { cashRegisterOpenSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cash.manage");
    const body = await request.json();
    const parsed = cashRegisterOpenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const register = await openCashRegister(parsed.data, session.sub);
    return NextResponse.json(register, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
