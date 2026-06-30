import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { UserCreateInput, UserUpdateInput } from "@/lib/validations/users";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    BLOCKED: "Bloqueado"
  };

  return labels[status] ?? status;
}

export async function listUserManagement() {
  const [users, roles] = await Promise.all([
    db.user.findMany({
      include: {
        role: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.role.findMany({
      orderBy: {
        name: "asc"
      }
    })
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      status: user.status,
      statusLabel: statusLabel(user.status),
      mustResetPassword: user.mustResetPassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? "",
      createdAt: user.createdAt.toISOString()
    })),
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? ""
    }))
  };
}

export async function createUser(data: UserCreateInput, userId: string) {
  try {
    const passwordHash = await hash(data.password, 10);
    const created = await db.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        roleId: data.roleId,
        status: data.status,
        passwordHash,
        mustResetPassword: true
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "users",
        action: "user_create",
        entityType: "User",
        entityId: created.id,
        metadata: {
          usuario: created.email,
          roleId: created.roleId,
          status: created.status
        }
      }
    });

    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ja existe um usuario com esse e-mail.");
    }

    throw error;
  }
}

export async function updateUser(id: string, data: UserUpdateInput, userId: string) {
  try {
    const updated = await db.user.update({
      where: {
        id
      },
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        roleId: data.roleId,
        status: data.status
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "users",
        action: "user_update",
        entityType: "User",
        entityId: updated.id,
        metadata: {
          usuario: updated.email,
          roleId: updated.roleId,
          status: updated.status
        }
      }
    });

    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ja existe um usuario com esse e-mail.");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Usuario nao encontrado.");
    }

    throw error;
  }
}
