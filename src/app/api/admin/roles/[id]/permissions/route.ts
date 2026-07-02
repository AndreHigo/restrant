import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateRolePermissions } from "@/lib/services/roles";

const schema = z.object({
  permissionIds: z.array(z.string().min(1)).default([])
});

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requirePermission("roles.update");
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const updated = await updateRolePermissions(params.id, parsed.data.permissionIds, session.sub);

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
