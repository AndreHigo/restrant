import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

function getRedirectTo(role: string) {
  return role === "cozinha" || role === "caixa" || role === "atendente" ? "/operacao" : "/admin";
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries(await request.formData());
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    if (acceptsHtml) {
      return NextResponse.redirect(new URL("/login?error=dados-invalidos", request.url), 303);
    }

    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const session = await login(parsed.data.email, parsed.data.password);

  if (!session) {
    if (acceptsHtml) {
      return NextResponse.redirect(new URL("/login?error=credenciais-invalidas", request.url), 303);
    }

    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  const redirectTo = getRedirectTo(session.role);

  if (acceptsHtml) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({
    user: session,
    redirectTo
  });
}
