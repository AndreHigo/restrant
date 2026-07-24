import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateRoleItemDiscountLimit } from "@/lib/services/roles";

const schema = z.object({
  itemDiscountLimitPercent: z.coerce.number().min(0, "Informe um limite entre 0 e 100%.").max(100, "Informe um limite entre 0 e 100%.").nullable()
});

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requirePermission("roles.update");
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    return NextResponse.json(
      await updateRoleItemDiscountLimit(params.id, parsed.data.itemDiscountLimitPercent, session.sub)
    );
  } catch (error) {
    return handleApiError(error);
  }
}
