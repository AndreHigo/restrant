import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { createUser, listUserManagement } from "@/lib/services/users";
import { userCreateSchema } from "@/lib/validations/users";

export async function GET() {
  try {
    await requirePermission("users.view");
    return NextResponse.json(await listUserManagement());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("users.create");
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para usuario." },
        { status: 400 }
      );
    }

    const created = await createUser(parsed.data, session.sub);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
