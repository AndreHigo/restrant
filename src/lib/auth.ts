import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET ?? "dev-secret");
const cookieName = "rb.session";

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
};

const operationalOnlyRoles = ["atendente", "caixa", "cozinha"];

export function canAccessAdmin(role: string) {
  return !operationalOnlyRoles.includes(role);
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
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

  const passwordOk = user ? await compare(password, user.passwordHash) : false;

  await db.loginLog.create({
    data: {
      userId: user?.id,
      email,
      success: passwordOk
    }
  });

  if (!user || !passwordOk || user.status !== "ACTIVE") {
    return null;
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
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    id: user.id,
    name: user.name,
    role: user.role.name,
    permissions
  };
}

export function logout() {
  cookies().delete(cookieName);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
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
