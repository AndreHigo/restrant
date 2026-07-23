import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { receiveAccountReceivable } from "@/lib/services/financial";
import { receiveAccountReceivableSchema } from "@/lib/validations/financial";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("financial.receive");
    const body = await request.json();
    const parsed = receiveAccountReceivableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const receivable = await receiveAccountReceivable(parsed.data, session.sub);
    return NextResponse.json(receivable);
  } catch (error) {
    return handleApiError(error);
  }
}
