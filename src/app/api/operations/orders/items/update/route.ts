import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateSalesOrderItem } from "@/lib/services/operations";
import { orderItemUpdateSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.adjust_item");
    const body = await request.json();
    const parsed = orderItemUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para editar o item." },
        { status: 400 }
      );
    }

    if (parsed.data.discount !== undefined && !session.permissions.includes("sales.discount_item")) {
      return NextResponse.json({ error: "Sem permissao para conceder desconto no item." }, { status: 403 });
    }

    const result = await updateSalesOrderItem(parsed.data, session.sub, {
      canOverrideDiscountLimit: session.permissions.includes("sales.discount_override")
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
