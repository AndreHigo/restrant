import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { getRequestMetadata } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/services/password-reset";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Usuario invalido." },
      { status: 400 }
    );
  }

  const result = await requestPasswordReset(parsed.data, request.url, getRequestMetadata(request));

  return NextResponse.json(result);
}
