import { NextResponse } from "next/server";
import { getRequestMetadata, login } from "@/lib/auth";
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

  const result = await login(parsed.data.email, parsed.data.password, getRequestMetadata(request));

  if (!result.ok && result.reason === "locked") {
    if (acceptsHtml) {
      return NextResponse.redirect(new URL("/login?error=tentativas-excedidas", request.url), 303);
    }

    return NextResponse.json(
      {
        error: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",
        retryAfterSeconds: result.retryAfterSeconds
      },
      {
        headers: result.retryAfterSeconds
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : undefined,
        status: 429
      }
    );
  }

  if (!result.ok) {
    if (acceptsHtml) {
      return NextResponse.redirect(new URL("/login?error=credenciais-invalidas", request.url), 303);
    }

    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  const redirectTo = getRedirectTo(result.user.role);

  if (acceptsHtml) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({
    user: result.user,
    redirectTo
  });
}
