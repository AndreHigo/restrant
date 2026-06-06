import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrAppendSalesOrder } from "@/lib/services/operations";
import { salesOrderCreateSchema } from "@/lib/validations/operations";

export async function GET() {
  try {
    await requirePermission("sales.view");
    const orders = await db.salesOrder.findMany({
      orderBy: { openedAt: "desc" },
      take: 30
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const body = await request.json();
    const parsed = salesOrderCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const order = await createOrAppendSalesOrder(parsed.data, session.sub);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
