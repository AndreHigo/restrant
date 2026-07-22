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

  if (result.rateLimited) {
    return NextResponse.json(
      { error: result.message, retryAfterSeconds: result.retryAfterSeconds },
      {
        headers: {
          "Retry-After": String(result.retryAfterSeconds ?? 60)
        },
        status: 429
      }
    );
  }

  return NextResponse.json(result);
}
