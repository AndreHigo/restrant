import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const userEmail = "qa-limite-recuperacao";
const userPassword = "Recuperacao@123";
const qaIpAddress = "203.0.113.78";
const qaUserAgent = "RestaurantBrasil-QA-Password-Reset-Limit";

async function ensureUser() {
  const role = await db.role.findUniqueOrThrow({ where: { name: "atendente" } });
  const user = await db.user.upsert({
    where: { email: userEmail },
    create: {
      email: userEmail,
      mustResetPassword: false,
      name: "QA Limite Recuperacao",
      passwordHash: hashSync(userPassword, 10),
      roleId: role.id,
      status: "ACTIVE"
    },
    update: {
      mustResetPassword: false,
      passwordHash: hashSync(userPassword, 10),
      roleId: role.id,
      status: "ACTIVE"
    }
  });

  await db.auditLog.deleteMany({
    where: {
      entityId: userEmail,
      entityType: "PasswordResetRequest",
      module: "auth"
    }
  });
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
}

async function requestReset() {
  return fetch(`${baseUrl}/api/auth/forgot-password`, {
    body: JSON.stringify({ email: userEmail }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST"
  });
}

async function main() {
  await ensureUser();

  const firstThree = await Promise.all([requestReset(), requestReset(), requestReset()]);
  const blockedResponse = await requestReset();
  const blockedPayload = await blockedResponse.json().catch(() => ({}));
  const attempts = await db.auditLog.count({
    where: {
      action: "password_reset_attempt",
      entityId: userEmail,
      entityType: "PasswordResetRequest",
      module: "auth"
    }
  });
  const blockedAudits = await db.auditLog.count({
    where: {
      action: "password_reset_rate_limited",
      entityId: userEmail,
      entityType: "PasswordResetRequest",
      module: "auth"
    }
  });
  const retryAfter = blockedResponse.headers.get("retry-after");
  const firstThreeAccepted = firstThree.every((response) => response.status === 200);

  console.table([
    { check: "tres solicitacoes iniciais aceitas", ok: firstThreeAccepted, status: firstThree.map((item) => item.status).join(",") },
    { check: "limite retorna 429", ok: blockedResponse.status === 429, status: blockedResponse.status },
    { check: "retry-after informado", ok: Boolean(retryAfter), status: retryAfter ?? "" },
    {
      check: "mensagem generica de limite",
      ok: String(blockedPayload.error ?? "").includes("temporariamente indisponivel"),
      status: blockedPayload.retryAfterSeconds ?? ""
    },
    { check: "tentativas auditadas", ok: attempts === 3, status: attempts },
    { check: "bloqueio auditado", ok: blockedAudits >= 1, status: blockedAudits }
  ]);

  if (!firstThreeAccepted || blockedResponse.status !== 429 || !retryAfter || attempts !== 3 || blockedAudits < 1) {
    throw new Error("Limite de recuperacao de senha falhou.");
  }

  console.log(`Limite de recuperacao de senha aprovado em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
