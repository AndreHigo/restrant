import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateOwnProfile } from "@/lib/services/users";
import { userProfileUpdateSchema } from "@/lib/validations/users";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = userProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para o perfil." },
        { status: 400 }
      );
    }

    const profile = await updateOwnProfile(session.sub, parsed.data);

    return NextResponse.json({
      email: profile.email,
      name: profile.name,
      success: true
    });
  } catch (error) {
    return handleApiError(error);
  }
}
