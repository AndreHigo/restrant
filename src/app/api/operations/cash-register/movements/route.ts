import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { createCashMovement } from "@/lib/services/operations";
import { cashMovementSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawType = typeof body === "object" && body ? (body as { type?: unknown }).type : undefined;
    const requiredPermission = rawType === "WITHDRAWAL" ? "cash.withdraw" : "cash.supply";
    const session = await requirePermission(requiredPermission);
    const parsed = cashMovementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const movement = await createCashMovement(parsed.data, session.sub);
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
