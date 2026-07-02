import { NextResponse } from "next/server";
import { getRequestMetadata } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { resetPasswordByToken } from "@/lib/services/password-reset";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const result = await resetPasswordByToken(parsed.data, getRequestMetadata(request));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
