import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import type { RequestMetadata } from "@/lib/auth";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/lib/validations/auth";

const tokenTtlMinutes = 30;
const resetRequestWindowMinutes = Number(process.env.PASSWORD_RESET_WINDOW_MINUTES ?? 60);
const resetRequestIdentifierLimit = Number(process.env.PASSWORD_RESET_IDENTIFIER_LIMIT ?? 3);
const resetRequestIpLimit = Number(process.env.PASSWORD_RESET_IP_LIMIT ?? 12);

type PasswordResetRequestResult = {
  success: true;
  message: string;
  rateLimited: boolean;
  retryAfterSeconds?: number;
  resetUrl?: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetUrl(requestUrl: string, token: string) {
  const url = new URL("/redefinir-senha", requestUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

function canExposeResetToken() {
  return process.env.PASSWORD_RESET_DEBUG === "true" || process.env.NODE_ENV !== "production";
}

function secondsUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

async function getResetRequestLock(identifier: string, ipAddress?: string) {
  const windowStart = new Date(Date.now() - resetRequestWindowMinutes * 60 * 1000);
  const [identifierAttempts, ipAttempts] = await Promise.all([
    db.auditLog.findMany({
      where: {
        action: "password_reset_attempt",
        createdAt: { gte: windowStart },
        entityId: identifier,
        entityType: "PasswordResetRequest",
        module: "auth"
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
      take: resetRequestIdentifierLimit
    }),
    ipAddress
      ? db.auditLog.findMany({
          where: {
            action: "password_reset_attempt",
            createdAt: { gte: windowStart },
            entityType: "PasswordResetRequest",
            metadata: {
              path: ["ipAddress"],
              equals: ipAddress
            },
            module: "auth"
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: resetRequestIpLimit
        })
      : Promise.resolve([])
  ]);
  const attempts =
    identifierAttempts.length >= resetRequestIdentifierLimit
      ? identifierAttempts
      : ipAttempts.length >= resetRequestIpLimit
        ? ipAttempts
        : [];
  const oldestAttempt = attempts[attempts.length - 1]?.createdAt;

  if (!oldestAttempt) {
    return null;
  }

  return new Date(oldestAttempt.getTime() + resetRequestWindowMinutes * 60 * 1000);
}

export async function requestPasswordReset(
  data: ForgotPasswordInput,
  requestUrl: string,
  metadata: RequestMetadata = {}
): Promise<PasswordResetRequestResult> {
  const identifier = data.email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: {
      email: identifier
    },
    select: {
      email: true,
      id: true,
      status: true
    }
  });
  const lockedUntil = await getResetRequestLock(identifier, metadata.ipAddress);

  if (lockedUntil) {
    await db.auditLog.create({
      data: {
        userId: user?.id,
        module: "auth",
        action: "password_reset_rate_limited",
        entityType: "PasswordResetRequest",
        entityId: identifier,
        metadata: {
          ipAddress: metadata.ipAddress,
          retryAfterSeconds: secondsUntil(lockedUntil),
          userAgent: metadata.userAgent
        }
      }
    });

    return {
      success: true,
      rateLimited: true,
      retryAfterSeconds: secondsUntil(lockedUntil),
      message: "Solicitacao temporariamente indisponivel. Tente novamente em alguns minutos."
    };
  }

  await db.auditLog.create({
    data: {
      userId: user?.id,
      module: "auth",
      action: "password_reset_attempt",
      entityType: "PasswordResetRequest",
      entityId: identifier,
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    }
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      success: true,
      rateLimited: false,
      message: "Se o usuario existir, a solicitacao de recuperacao foi registrada."
    };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + tokenTtlMinutes * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });

    await tx.passwordResetToken.create({
      data: {
        expiresAt,
        tokenHash,
        userId: user.id
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        module: "auth",
        action: "password_reset_requested",
        entityType: "User",
        entityId: user.id,
        metadata: {
          expiresAt: expiresAt.toISOString(),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }
    });
  });

  return {
    success: true,
    rateLimited: false,
    message: "Se o usuario existir, a solicitacao de recuperacao foi registrada.",
    ...(canExposeResetToken()
      ? {
          resetUrl: createResetUrl(requestUrl, token)
        }
      : {})
  };
}

export async function resetPasswordByToken(data: ResetPasswordInput, metadata: RequestMetadata = {}) {
  const tokenHash = hashToken(data.token.trim());
  const resetToken = await db.passwordResetToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: {
        select: {
          email: true,
          id: true,
          status: true
        }
      }
    }
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now() ||
    resetToken.user.status !== "ACTIVE"
  ) {
    throw new Error("Token invalido ou expirado.");
  }

  const passwordHash = await hash(data.newPassword, 10);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: resetToken.userId
      },
      data: {
        mustResetPassword: false,
        passwordHash
      }
    });

    await tx.passwordResetToken.update({
      where: {
        id: resetToken.id
      },
      data: {
        usedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        userId: resetToken.userId,
        module: "auth",
        action: "password_reset_completed",
        entityType: "User",
        entityId: resetToken.userId,
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }
    });
  });

  return {
    success: true
  };
}
