import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Usuario invalido." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() }
  });

  if (user) {
    await db.auditLog.create({
      data: {
        userId: user.id,
        module: "auth",
        action: "forgot_password",
        entityType: "user",
        entityId: user.id
      }
    });
  }

  return NextResponse.json({
    success: true,
    message: "Se o usuario existir, a solicitacao de recuperacao foi registrada."
  });
}
