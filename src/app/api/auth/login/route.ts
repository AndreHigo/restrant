import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const session = await login(parsed.data.email, parsed.data.password);

  if (!session) {
    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  return NextResponse.json({
    user: session,
    redirectTo: session.role === "cozinha" || session.role === "caixa" || session.role === "atendente" ? "/operacao" : "/admin"
  });
}
