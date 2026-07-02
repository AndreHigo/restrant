import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const attendantEmail = "qa-atendente";
const attendantPassword = "Atendente@123";
const inactiveEmail = "qa-inativo";
const inactivePassword = "Inativo@123";
const managerEmail = "qa-gerente";
const managerPassword = "Gerente@123";
const resetEmail = "qa-reset";
const resetPassword = "Reset@123";
const resetNextPassword = "Reset@456";
const adminEmail = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const adminPassword = process.env.SMOKE_PASSWORD ?? "Admin@123";
const qaIpAddress = "203.0.113.10";
const qaUserAgent = "RestaurantBrasil-QA-RBAC";

function getSetCookie(headers: Headers) {
  const anyHeaders = headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (anyHeaders.getSetCookie) {
    return anyHeaders.getSetCookie();
  }

  const rawCookies = anyHeaders.raw?.()["set-cookie"];

  if (rawCookies) {
    return rawCookies;
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function createCookieHeader(setCookies: string[]) {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function ensureAttendantUser() {
  const [attendantRole, managerRole] = await Promise.all([
    db.role.findUniqueOrThrow({ where: { name: "atendente" } }),
    db.role.findUniqueOrThrow({ where: { name: "gerente" } })
  ]);

  await Promise.all([
    db.user.upsert({
      where: { email: attendantEmail },
      create: {
        email: attendantEmail,
        mustResetPassword: false,
        name: "QA Atendente",
        passwordHash: hashSync(attendantPassword, 10),
        roleId: attendantRole.id,
        status: "ACTIVE"
      },
      update: {
        mustResetPassword: false,
        passwordHash: hashSync(attendantPassword, 10),
        roleId: attendantRole.id,
        status: "ACTIVE"
      }
    }),
    db.user.upsert({
      where: { email: inactiveEmail },
      create: {
        email: inactiveEmail,
        mustResetPassword: false,
        name: "QA Inativo",
        passwordHash: hashSync(inactivePassword, 10),
        roleId: attendantRole.id,
        status: "INACTIVE"
      },
      update: {
        mustResetPassword: false,
        passwordHash: hashSync(inactivePassword, 10),
        roleId: attendantRole.id,
        status: "INACTIVE"
      }
    }),
    db.user.upsert({
      where: { email: managerEmail },
      create: {
        email: managerEmail,
        mustResetPassword: false,
        name: "QA Gerente",
        passwordHash: hashSync(managerPassword, 10),
        roleId: managerRole.id,
        status: "ACTIVE"
      },
      update: {
        mustResetPassword: false,
        passwordHash: hashSync(managerPassword, 10),
        roleId: managerRole.id,
        status: "ACTIVE"
      }
    }),
    db.user.upsert({
      where: { email: resetEmail },
      create: {
        email: resetEmail,
        mustResetPassword: false,
        name: "QA Reset",
        passwordHash: hashSync(resetPassword, 10),
        roleId: attendantRole.id,
        status: "ACTIVE"
      },
      update: {
        mustResetPassword: false,
        passwordHash: hashSync(resetPassword, 10),
        roleId: attendantRole.id,
        status: "ACTIVE"
      }
    })
  ]);
}

async function login(email: string, password: string, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST",
    redirect: "manual"
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `Login de ${email} retornou HTTP ${response.status}, esperado ${expectedStatus}: ${(await response.text()).slice(0, 200)}`
    );
  }

  const cookieHeader = createCookieHeader(getSetCookie(response.headers));
  const setCookieText = getSetCookie(response.headers).join("; ").toLowerCase();

  if (expectedStatus !== 200) {
    if (cookieHeader) {
      throw new Error(`Login bloqueado de ${email} retornou cookie indevidamente.`);
    }

    return "";
  }

  if (!cookieHeader) {
    throw new Error(`Login de ${email} nao retornou cookie de sessao.`);
  }

  if (
    !setCookieText.includes("httponly") ||
    !setCookieText.includes("samesite=lax") ||
    !setCookieText.includes("path=/") ||
    !setCookieText.includes("max-age=43200")
  ) {
    throw new Error(`Cookie de sessao de ${email} nao recebeu atributos seguros esperados.`);
  }

  return cookieHeader;
}

async function getRolePayload(cookie: string, roleName: string) {
  const response = await fetch(`${baseUrl}/api/admin/roles`, {
    headers: { cookie }
  });

  if (!response.ok) {
    throw new Error(`Consulta de perfis falhou com HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const roles = await response.json();
  const role = roles.find((item: { name: string }) => item.name === roleName);

  if (!role) {
    throw new Error(`Perfil ${roleName} nao encontrado na API.`);
  }

  return role as {
    id: string;
    name: string;
    permissions: Array<{
      permission: {
        id: string;
      };
    }>;
  };
}

async function main() {
  await ensureAttendantUser();

  const loginLogsBefore = await db.loginLog.count({
    where: {
      email: attendantEmail,
      ipAddress: qaIpAddress,
      userAgent: qaUserAgent
    }
  });
  const authAuditBefore = await db.auditLog.count({
    where: {
      module: "auth",
      action: {
        in: ["login_success", "logout"]
      },
      metadata: {
        path: ["ipAddress"],
        equals: qaIpAddress
      }
    }
  });

  await login(attendantEmail, "SenhaErrada@123", 401);
  await login(inactiveEmail, inactivePassword, 401);

  const cookie = await login(attendantEmail, attendantPassword);
  const managerCookie = await login(managerEmail, managerPassword);
  const adminCookie = await login(adminEmail, adminPassword);

  const adminResponse = await fetch(`${baseUrl}/admin`, {
    headers: { cookie },
    redirect: "manual"
  });
  const operationResponse = await fetch(`${baseUrl}/operacao`, {
    headers: { cookie }
  });
  const operationBody = await operationResponse.text();

  const adminBlocked =
    adminResponse.status >= 300 &&
    adminResponse.status < 400 &&
    (adminResponse.headers.get("location") ?? "").includes("/operacao");
  const operationAllowed = operationResponse.ok && operationBody.includes("Painel operacional");
  const loggedUserVisible =
    operationBody.includes("QA Atendente") &&
    operationBody.includes("qa-atendente") &&
    operationBody.includes("Preferencias");
  const adminShortcutBlocked =
    operationBody.includes("Administracao bloqueada") &&
    !operationBody.includes("Ir para administracao");
  const unauthorizedMenusHidden =
    !operationBody.includes(">Caixa<") &&
    operationBody.includes(">Pedidos<") &&
    operationBody.includes(">Balanca<");
  const adminPageResponse = await fetch(`${baseUrl}/admin/perfis`, {
    headers: { cookie: adminCookie }
  });
  const adminPageBody = await adminPageResponse.text();
  const adminCanSeeRoles =
    adminPageResponse.ok &&
    adminPageBody.includes("Perfis e permissoes") &&
    adminPageBody.includes("Salvar permissoes");
  const attendantProductsApiResponse = await fetch(`${baseUrl}/api/admin/products`, {
    body: JSON.stringify({
      categoryId: "categoria-inexistente",
      code: "999999",
      name: "Produto bloqueado por RBAC",
      price: 1
    }),
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    method: "POST"
  });
  const attendantBlockedOnAdminApi = attendantProductsApiResponse.status === 403;

  const managerRole = await getRolePayload(adminCookie, "gerente");
  const attendantRole = await getRolePayload(adminCookie, "atendente");
  const administratorRole = await getRolePayload(adminCookie, "administrador");
  const managerPermissionIds = managerRole.permissions.map(({ permission }) => permission.id);
  const attendantPermissionIds = attendantRole.permissions.map(({ permission }) => permission.id);

  const managerRoleUpdateResponse = await fetch(
    `${baseUrl}/api/admin/roles/${attendantRole.id}/permissions`,
    {
      body: JSON.stringify({ permissionIds: attendantPermissionIds }),
      headers: {
        "Content-Type": "application/json",
        cookie: managerCookie
      },
      method: "PATCH"
    }
  );
  const managerCannotUpdateRoles = managerRoleUpdateResponse.status === 403;

  const adminRoleUpdateResponse = await fetch(
    `${baseUrl}/api/admin/roles/${managerRole.id}/permissions`,
    {
      body: JSON.stringify({ permissionIds: managerPermissionIds }),
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie
      },
      method: "PATCH"
    }
  );
  const adminCanUpdateRoles = adminRoleUpdateResponse.ok;

  const administratorProtectedResponse = await fetch(
    `${baseUrl}/api/admin/roles/${administratorRole.id}/permissions`,
    {
      body: JSON.stringify({ permissionIds: managerPermissionIds }),
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie
      },
      method: "PATCH"
    }
  );
  const administratorProtected = administratorProtectedResponse.status === 400;

  const profileResponse = await fetch(`${baseUrl}/perfil`, {
    headers: { cookie }
  });
  const profileBody = await profileResponse.text();
  const attendantCanReadOwnProfile =
    profileResponse.ok &&
    profileBody.includes("Preferencias do usuario") &&
    profileBody.includes("QA Atendente") &&
    profileBody.includes(attendantEmail);
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    headers: {
      cookie,
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST"
  });
  const logoutSetCookieText = getSetCookie(logoutResponse.headers).join("; ").toLowerCase();
  const sessionAfterLogoutResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { cookie: createCookieHeader(getSetCookie(logoutResponse.headers)) }
  });
  const logoutClearsSession =
    logoutResponse.ok &&
    sessionAfterLogoutResponse.status === 401 &&
    logoutSetCookieText.includes("rb.session=") &&
    (logoutSetCookieText.includes("max-age=0") || logoutSetCookieText.includes("expires="));
  const loginLogsAfter = await db.loginLog.count({
    where: {
      email: attendantEmail,
      ipAddress: qaIpAddress,
      userAgent: qaUserAgent
    }
  });
  const authAuditAfter = await db.auditLog.count({
    where: {
      module: "auth",
      action: {
        in: ["login_success", "logout"]
      },
      metadata: {
        path: ["ipAddress"],
        equals: qaIpAddress
      }
    }
  });
  const loginContextPersisted = loginLogsAfter >= loginLogsBefore + 2;
  const authAuditPersisted = authAuditAfter >= authAuditBefore + 4;
  const resetRequestResponse = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    body: JSON.stringify({ email: resetEmail }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST"
  });
  const resetRequestPayload = await resetRequestResponse.json().catch(() => ({}));
  const resetUrl = String(resetRequestPayload.resetUrl ?? "");
  const resetToken = resetUrl ? new URL(resetUrl).searchParams.get("token") ?? "" : "";
  const resetRequestWorked =
    resetRequestResponse.ok &&
    resetRequestPayload.success === true &&
    resetUrl.includes("/redefinir-senha") &&
    resetToken.length >= 24;
  const resetPageResponse = await fetch(`${baseUrl}/redefinir-senha?token=${encodeURIComponent(resetToken)}`);
  const resetPageBody = await resetPageResponse.text();
  const resetPageWorked =
    resetPageResponse.ok &&
    resetPageBody.includes("Redefinir senha") &&
    resetPageBody.includes("Crie uma nova senha");
  const resetPasswordResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
    body: JSON.stringify({
      confirmPassword: resetNextPassword,
      newPassword: resetNextPassword,
      token: resetToken
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": qaUserAgent,
      "X-Forwarded-For": qaIpAddress
    },
    method: "POST"
  });
  const resetPasswordWorked = resetPasswordResponse.ok;
  await login(resetEmail, resetPassword, 401);
  const resetLoginCookie = await login(resetEmail, resetNextPassword);
  const resetReuseResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
    body: JSON.stringify({
      confirmPassword: resetPassword,
      newPassword: resetPassword,
      token: resetToken
    }),
    headers: {
      "Content-Type": "application/json",
      cookie: resetLoginCookie
    },
    method: "POST"
  });
  const resetTokenCannotReuse = resetReuseResponse.status === 400;
  const resetAuditCount = await db.auditLog.count({
    where: {
      module: "auth",
      action: {
        in: ["password_reset_requested", "password_reset_completed"]
      },
      user: {
        email: resetEmail
      }
    }
  });
  const resetAuditPersisted = resetAuditCount >= 2;

  console.table([
    { check: "login invalido sem cookie", ok: true, status: 401 },
    { check: "usuario inativo bloqueado", ok: true, status: 401 },
    { check: "atendente bloqueado no admin", ok: adminBlocked, status: adminResponse.status },
    { check: "atendente liberado na operacao", ok: operationAllowed, status: operationResponse.status },
    { check: "usuario logado visivel", ok: loggedUserVisible, status: operationResponse.status },
    { check: "atalho admin bloqueado na operacao", ok: adminShortcutBlocked, status: operationResponse.status },
    { check: "menus sem permissao ocultos", ok: unauthorizedMenusHidden, status: operationResponse.status },
    { check: "admin acessa perfis", ok: adminCanSeeRoles, status: adminPageResponse.status },
    {
      check: "atendente bloqueado em API admin",
      ok: attendantBlockedOnAdminApi,
      status: attendantProductsApiResponse.status
    },
    {
      check: "gerente nao edita permissoes",
      ok: managerCannotUpdateRoles,
      status: managerRoleUpdateResponse.status
    },
    { check: "admin edita permissoes", ok: adminCanUpdateRoles, status: adminRoleUpdateResponse.status },
    {
      check: "perfil administrador protegido",
      ok: administratorProtected,
      status: administratorProtectedResponse.status
    },
    { check: "atendente le proprio perfil", ok: attendantCanReadOwnProfile, status: profileResponse.status },
    { check: "logout limpa sessao", ok: logoutClearsSession, status: logoutResponse.status },
    { check: "login registra contexto", ok: loginContextPersisted, status: loginLogsAfter },
    { check: "auditoria registra acesso", ok: authAuditPersisted, status: authAuditAfter },
    { check: "recuperacao gera token", ok: resetRequestWorked, status: resetRequestResponse.status },
    { check: "pagina de redefinicao abre", ok: resetPageWorked, status: resetPageResponse.status },
    { check: "senha redefinida por token", ok: resetPasswordWorked, status: resetPasswordResponse.status },
    { check: "token nao reutiliza", ok: resetTokenCannotReuse, status: resetReuseResponse.status },
    { check: "auditoria registra redefinicao", ok: resetAuditPersisted, status: resetAuditCount }
  ]);

  if (
    !adminBlocked ||
    !operationAllowed ||
    !loggedUserVisible ||
    !adminShortcutBlocked ||
    !unauthorizedMenusHidden ||
    !adminCanSeeRoles ||
    !attendantBlockedOnAdminApi ||
    !managerCannotUpdateRoles ||
    !adminCanUpdateRoles ||
    !administratorProtected ||
    !attendantCanReadOwnProfile ||
    !logoutClearsSession ||
    !loginContextPersisted ||
    !authAuditPersisted ||
    !resetRequestWorked ||
    !resetPageWorked ||
    !resetPasswordWorked ||
    !resetTokenCannotReuse ||
    !resetAuditPersisted
  ) {
    throw new Error("Autenticacao ou RBAC falhou.");
  }

  console.log(`Autenticacao e RBAC aprovados em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
