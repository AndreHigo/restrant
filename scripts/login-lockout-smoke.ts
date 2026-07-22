import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const userEmail = "qa-bloqueio-login";
const userPassword = "Bloqueio@123";
const qaIpAddress = "203.0.113.77";
const qaUserAgent = "RestaurantBrasil-QA-Login-Lockout";

async function ensureUser() {
  const role = await db.role.findUniqueOrThrow({ where: { name: "atendente" } });

  await db.user.upsert({
    where: { email: userEmail },
    create: {
      email: userEmail,
      mustResetPassword: false,
      name: "QA Bloqueio Login",
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

  await db.loginLog.deleteMany({
    where: {
      email: userEmail,
      ipAddress: qaIpAddress,
      userAgent: qaUserAgent
    }
  });
}

async function postLogin(password: string) {
  return fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email: userEmail, password }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST",
    redirect: "manual"
  });
}

async function main() {
  await ensureUser();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await postLogin(`SenhaErrada@${attempt}`);

    if (response.status !== 401) {
      throw new Error(`Tentativa invalida ${attempt} retornou HTTP ${response.status}, esperado 401.`);
    }
  }

  const blockedResponse = await postLogin("SenhaErrada@6");
  const blockedPayload = await blockedResponse.json().catch(() => ({}));
  const retryAfter = blockedResponse.headers.get("retry-after");
  const correctPasswordDuringLock = await postLogin(userPassword);
  const loginLogs = await db.loginLog.count({
    where: {
      email: userEmail,
      ipAddress: qaIpAddress,
      success: false,
      userAgent: qaUserAgent
    }
  });
  const auditLogs = await db.auditLog.count({
    where: {
      action: "login_locked",
      module: "auth",
      metadata: {
        path: ["ipAddress"],
        equals: qaIpAddress
      },
      user: {
        email: userEmail
      }
    }
  });

  console.table([
    { check: "bloqueio retorna 429", ok: blockedResponse.status === 429, status: blockedResponse.status },
    { check: "retry-after informado", ok: Boolean(retryAfter), status: retryAfter ?? "" },
    {
      check: "mensagem de bloqueio retornada",
      ok: String(blockedPayload.error ?? "").includes("Muitas tentativas"),
      status: blockedPayload.retryAfterSeconds ?? ""
    },
    {
      check: "senha correta bloqueada na janela",
      ok: correctPasswordDuringLock.status === 429,
      status: correctPasswordDuringLock.status
    },
    { check: "falhas persistidas", ok: loginLogs >= 7, status: loginLogs },
    { check: "auditoria de bloqueio persistida", ok: auditLogs >= 2, status: auditLogs }
  ]);

  if (
    blockedResponse.status !== 429 ||
    !retryAfter ||
    !String(blockedPayload.error ?? "").includes("Muitas tentativas") ||
    correctPasswordDuringLock.status !== 429 ||
    loginLogs < 7 ||
    auditLogs < 2
  ) {
    throw new Error("Bloqueio temporario de login falhou.");
  }

  console.log(`Bloqueio temporario de login aprovado em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
