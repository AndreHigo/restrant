import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateUser } from "@/lib/services/users";
import { userUpdateSchema } from "@/lib/validations/users";

type UserRouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: UserRouteContext) {
  try {
    const session = await requirePermission("users.update");
    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para usuario." },
        { status: 400 }
      );
    }

    const updated = await updateUser(params.id, parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
