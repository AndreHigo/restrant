import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type PermissionItem = {
  id: string;
  module: string;
  action: string;
  label: string;
  key: string;
};

export type RolePermissionItem = {
  id: string;
  name: string;
  description: string;
  itemDiscountLimitPercent: number | null;
  isSystem: boolean;
  permissionIds: string[];
  permissions: PermissionItem[];
  usersCount: number;
};

function mapPermission(permission: {
  id: string;
  module: string;
  action: string;
  label: string;
}): PermissionItem {
  return {
    id: permission.id,
    module: permission.module,
    action: permission.action,
    label: permission.label,
    key: `${permission.module}.${permission.action}`
  };
}

export async function listRolePermissionManagement() {
  const [roles, permissions] = await Promise.all([
    db.role.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        },
        permissions: {
          include: {
            permission: true
          },
          orderBy: [
            {
              permission: {
                module: "asc"
              }
            },
            {
              permission: {
                action: "asc"
              }
            }
          ]
        }
      },
      orderBy: {
        name: "asc"
      }
    }),
    db.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }]
    })
  ]);

  return {
    permissions: permissions.map(mapPermission),
    roles: roles.map<RolePermissionItem>((role) => {
      const mappedPermissions = role.permissions.map(({ permission }) => mapPermission(permission));

      return {
        id: role.id,
        name: role.name,
        description: role.description ?? "",
        itemDiscountLimitPercent:
          role.itemDiscountLimitPercent === null ? null : Number(role.itemDiscountLimitPercent),
        isSystem: role.isSystem,
        permissionIds: mappedPermissions.map((permission) => permission.id),
        permissions: mappedPermissions,
        usersCount: role._count.users
      };
    })
  };
}

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  userId: string
) {
  const uniquePermissionIds = Array.from(new Set(permissionIds));

  const role = await db.role.findUnique({
    where: {
      id: roleId
    },
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!role) {
    throw new Error("Perfil nao encontrado.");
  }

  if (role.name === "administrador") {
    throw new Error("O perfil administrador nao pode ser alterado pela interface.");
  }

  if (uniquePermissionIds.length > 0) {
    const validPermissions = await db.permission.count({
      where: {
        id: {
          in: uniquePermissionIds
        }
      }
    });

    if (validPermissions !== uniquePermissionIds.length) {
      throw new Error("Existe permissao invalida na selecao.");
    }
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId
        }
      });

      if (uniquePermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            roleId,
            permissionId
          }))
        });
      }

      const nextRole = await tx.role.findUniqueOrThrow({
        where: {
          id: roleId
        },
        include: {
          _count: {
            select: {
              users: true
            }
          },
          permissions: {
            include: {
              permission: true
            },
            orderBy: [
              {
                permission: {
                  module: "asc"
                }
              },
              {
                permission: {
                  action: "asc"
                }
              }
            ]
          }
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          module: "roles",
          action: "role_permissions_update",
          entityType: "Role",
          entityId: roleId,
          metadata: {
            perfil: role.name,
            anterior: role.permissions.map(({ permission }) => `${permission.module}.${permission.action}`),
            novo: nextRole.permissions.map(
              ({ permission }) => `${permission.module}.${permission.action}`
            )
          }
        }
      });

      return nextRole;
    });

    const mappedPermissions = updated.permissions.map(({ permission }) => mapPermission(permission));

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? "",
      itemDiscountLimitPercent:
        updated.itemDiscountLimitPercent === null ? null : Number(updated.itemDiscountLimitPercent),
      isSystem: updated.isSystem,
      permissionIds: mappedPermissions.map((permission) => permission.id),
      permissions: mappedPermissions,
      usersCount: updated._count.users
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Perfil nao encontrado.");
    }

    throw error;
  }
}

export async function updateRoleItemDiscountLimit(
  roleId: string,
  itemDiscountLimitPercent: number | null,
  userId: string
) {
  const role = await db.role.findUnique({ where: { id: roleId } });

  if (!role) {
    throw new Error("Perfil nao encontrado.");
  }

  if (role.name === "administrador") {
    throw new Error("O perfil administrador nao pode ser alterado pela interface.");
  }

  const updated = await db.$transaction(async (tx) => {
    const nextRole = await tx.role.update({
      where: { id: roleId },
      data: { itemDiscountLimitPercent }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "roles",
        action: "role_item_discount_limit_update",
        entityType: "Role",
        entityId: roleId,
        metadata: {
          perfil: role.name,
          anterior: role.itemDiscountLimitPercent === null ? null : Number(role.itemDiscountLimitPercent),
          novo: itemDiscountLimitPercent
        }
      }
    });

    return nextRole;
  });

  return {
    id: updated.id,
    itemDiscountLimitPercent:
      updated.itemDiscountLimitPercent === null ? null : Number(updated.itemDiscountLimitPercent)
  };
}
