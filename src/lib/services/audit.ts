import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditFilters = {
  module?: string;
  action?: string;
  search?: string;
};

function formatMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata) {
    return "";
  }

  return JSON.stringify(metadata);
}

export async function listAuditDashboard(filters: AuditFilters = {}) {
  const module = filters.module?.trim();
  const action = filters.action?.trim();
  const search = filters.search?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(module ? { module } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { module: { contains: search, mode: "insensitive" } },
            { action: { contains: search, mode: "insensitive" } },
            { entityType: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [logs, loginLogs, totalEvents, todayEvents, failedLogins, modules] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 80
    }),
    db.loginLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.auditLog.count(),
    db.auditLog.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    }),
    db.loginLog.count({
      where: {
        success: false,
        createdAt: {
          gte: today
        }
      }
    }),
    db.auditLog.groupBy({
      by: ["module"],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          module: "desc"
        }
      },
      take: 12
    })
  ]);

  return {
    filters: {
      module: module ?? "",
      action: action ?? "",
      search: search ?? ""
    },
    kpis: {
      totalEvents,
      todayEvents,
      failedLogins,
      modulesCount: modules.length
    },
    modules: modules.map((item) => ({
      module: item.module,
      count: item._count._all
    })),
    logs: logs.map((item) => ({
      id: item.id,
      module: item.module,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId ?? "",
      userName: item.user?.name ?? "Sistema",
      userEmail: item.user?.email ?? "",
      metadata: formatMetadata(item.metadata),
      createdAt: item.createdAt.toISOString()
    })),
    loginLogs: loginLogs.map((item) => ({
      id: item.id,
      email: item.email,
      userName: item.user?.name ?? "",
      success: item.success,
      ipAddress: item.ipAddress ?? "",
      userAgent: item.userAgent ?? "",
      createdAt: item.createdAt.toISOString()
    }))
  };
}
