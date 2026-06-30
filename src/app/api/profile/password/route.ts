import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { changeOwnPassword } from "@/lib/services/users";
import { userPasswordChangeSchema } from "@/lib/validations/users";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = userPasswordChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para senha." },
        { status: 400 }
      );
    }

    await changeOwnPassword(session.sub, parsed.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
