import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerOrderPayments } from "@/lib/services/operations";
import { orderPaymentSchema } from "@/lib/validations/operations";

export async function GET() {
  try {
    await requirePermission("cash.manage");

    return NextResponse.json(
      await db.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 50
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cash.charge");
    const body = await request.json();
    const parsed = orderPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const payment = await registerOrderPayments(parsed.data, session.sub);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
