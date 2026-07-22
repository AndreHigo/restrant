import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET ?? "dev-secret");
const cookieName = "rb.session";
const sessionDurationSeconds = 60 * 60 * 12;
const tokenIssuer = "restaurant-brasil";
const tokenAudience = "restaurant-brasil-web";
const failedLoginWindowMinutes = Number(process.env.LOGIN_FAILED_WINDOW_MINUTES ?? 15);
const failedLoginLimit = Number(process.env.LOGIN_FAILED_LIMIT ?? 5);
const failedLoginIpLimit = Number(process.env.LOGIN_FAILED_IP_LIMIT ?? 30);
const loginLockoutMinutes = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 10);

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

export type LoginResult =
  | {
      ok: true;
      user: {
        id: string;
        name: string;
        role: string;
        permissions: string[];
      };
    }
  | {
      ok: false;
      reason: "invalid" | "locked";
      retryAfterSeconds?: number;
    };

const operationalOnlyRoles = ["atendente", "caixa", "cozinha"];

export function canAccessAdmin(role: string) {
  return !operationalOnlyRoles.includes(role);
}

function getForwardedIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    undefined
  );
}

export function getRequestMetadata(request: Request): RequestMetadata {
  return {
    ipAddress: getForwardedIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || undefined
  };
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function secondsUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

async function getLoginLock(identifier: string, ipAddress?: string) {
  const windowStart = minutesAgo(failedLoginWindowMinutes);
  const [identifierFailures, ipFailures] = await Promise.all([
    db.loginLog.findMany({
      where: {
        createdAt: { gte: windowStart },
        email: identifier,
        success: false
      },
      orderBy: { createdAt: "desc" },
      take: failedLoginLimit
    }),
    ipAddress
      ? db.loginLog.findMany({
          where: {
            createdAt: { gte: windowStart },
            ipAddress,
            success: false
          },
          orderBy: { createdAt: "desc" },
          take: failedLoginIpLimit
        })
      : Promise.resolve([])
  ]);
  const failedAttempts =
    identifierFailures.length >= failedLoginLimit
      ? identifierFailures
      : ipFailures.length >= failedLoginIpLimit
        ? ipFailures
        : [];

  if (failedAttempts.length === 0) {
    return null;
  }

  const newestFailure = failedAttempts[0]?.createdAt;

  if (!newestFailure) {
    return null;
  }

  const lockedUntil = new Date(newestFailure.getTime() + loginLockoutMinutes * 60 * 1000);

  if (lockedUntil <= new Date()) {
    return null;
  }

  return lockedUntil;
}

export async function login(email: string, password: string, metadata: RequestMetadata = {}): Promise<LoginResult> {
  const identifier = email.trim().toLowerCase();
  const lockedUntil = await getLoginLock(identifier, metadata.ipAddress);
  const user = await db.user.findUnique({
    where: { email: identifier },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (lockedUntil) {
    await db.loginLog.create({
      data: {
        userId: user?.id,
        email: identifier,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        success: false
      }
    });

    await db.auditLog.create({
      data: {
        userId: user?.id,
        module: "auth",
        action: "login_locked",
        entityType: user ? "User" : "Login",
        entityId: user?.id ?? identifier,
        metadata: {
          ipAddress: metadata.ipAddress,
          retryAfterSeconds: secondsUntil(lockedUntil),
          userAgent: metadata.userAgent
        }
      }
    });

    return {
      ok: false,
      reason: "locked",
      retryAfterSeconds: secondsUntil(lockedUntil)
    };
  }

  const passwordOk = user ? await compare(password, user.passwordHash) : false;
  const success = Boolean(user && passwordOk && user.status === "ACTIVE");

  await db.loginLog.create({
    data: {
      userId: user?.id,
      email: identifier,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      success
    }
  });

  if (!success || !user) {
    return { ok: false, reason: "invalid" };
  }

  const permissions = user.role.permissions.map(
    ({ permission }) => `${permission.module}.${permission.action}`
  );

  const token = await new SignJWT({
    email: user.email,
    role: user.role.name,
    permissions
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(secret);

  cookies().set(cookieName, token, {
    httpOnly: true,
    maxAge: sessionDurationSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "auth",
      action: "login_success",
      entityType: "User",
      entityId: user.id,
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    }
  });

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role.name,
      permissions
    }
  };
}

export async function logout(metadata: RequestMetadata = {}) {
  const session = await getSession();

  cookies().delete(cookieName);

  if (!session) {
    return;
  }

  await db.auditLog.create({
    data: {
      userId: session.sub,
      module: "auth",
      action: "logout",
      entityType: "User",
      entityId: session.sub,
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    }
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: tokenAudience,
      issuer: tokenIssuer
    });
    const userId = String(payload.sub);
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    const permissions = user.role.permissions.map(
      ({ permission }) => `${permission.module}.${permission.action}`
    );

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireSession();

  if (!session.permissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}

export async function requirePagePermission(permission: string) {
  try {
    return await requirePermission(permission);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/admin");
    }

    throw error;
  }
}

export async function requireAdminAccess() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canAccessAdmin(session.role)) {
    redirect("/operacao");
  }

  return session;
}
