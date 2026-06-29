import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateProduct } from "@/lib/services/master-data";
import { productSchema } from "@/lib/validations/master-data";

type ProductRouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: ProductRouteContext) {
  try {
    const session = await requirePermission("products.manage");
    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const updated = await updateProduct(params.id, parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
