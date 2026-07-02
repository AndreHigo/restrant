import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import type { RequestMetadata } from "@/lib/auth";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/lib/validations/auth";

const tokenTtlMinutes = 30;

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

export async function requestPasswordReset(
  data: ForgotPasswordInput,
  requestUrl: string,
  metadata: RequestMetadata = {}
) {
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

  if (!user || user.status !== "ACTIVE") {
    return {
      success: true,
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
