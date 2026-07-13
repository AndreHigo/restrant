import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ScaleDeviceInput } from "@/lib/validations/scale";

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function connectionLabel(value: string) {
  const labels: Record<string, string> = {
    serial: "Serial",
    usb: "USB",
    api: "API",
    manual: "Manual"
  };

  return labels[value] ?? value;
}

export async function listScaleAdminDashboard() {
  const [devices, readings, totalReadings, manualReadings] = await Promise.all([
    db.scaleDevice.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    db.scaleReading.findMany({
      include: {
        scaleDevice: true,
        product: {
          select: {
            name: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    db.scaleReading.count(),
    db.scaleReading.count({
      where: {
        source: "MANUAL"
      }
    })
  ]);
  const changedByIds = Array.from(
    new Set(readings.map((reading) => reading.changedBy).filter((value): value is string => Boolean(value)))
  );
  const users = changedByIds.length
    ? await db.user.findMany({
        where: {
          id: {
            in: changedByIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    : [];
  const userById = new Map(users.map((user) => [user.id, user.name || user.email]));

  return {
    kpis: {
      devicesCount: devices.length,
      activeDevicesCount: devices.filter((device) => device.active).length,
      totalReadings,
      manualReadings
    },
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      identifier: device.identifier,
      modelName: device.modelName ?? "",
      connectionType: device.connectionType,
      connectionLabel: connectionLabel(device.connectionType),
      port: device.port ?? "",
      baudRate: device.baudRate ?? null,
      endpoint: device.endpoint ?? "",
      stabilityMs: device.stabilityMs,
      minStableReads: device.minStableReads,
      tareKg: Number(device.tareKg),
      active: device.active,
      updatedAt: device.updatedAt.toISOString()
    })),
    readings: readings.map((reading) => ({
      id: reading.id,
      deviceName: reading.scaleDevice?.name ?? "Leitura manual",
      source: reading.source,
      weight: Number(reading.weightKg),
      unitPrice: Number(reading.pricePerKg ?? reading.product?.price ?? 0),
      totalPrice: Number(reading.totalPrice),
      productName: reading.product?.name ?? "",
      userName: reading.changedBy ? userById.get(reading.changedBy) ?? reading.changedBy : "Sistema",
      createdAt: reading.createdAt.toISOString()
    }))
  };
}

export async function createScaleDevice(data: ScaleDeviceInput, userId: string) {
  try {
    const device = await db.scaleDevice.create({
      data: {
        name: data.name.trim(),
        identifier: data.identifier.trim(),
        modelName: cleanOptional(data.modelName),
        connectionType: data.connectionType,
        port: cleanOptional(data.port),
        baudRate: typeof data.baudRate === "number" ? data.baudRate : null,
        endpoint: cleanOptional(data.endpoint),
        stabilityMs: data.stabilityMs,
        minStableReads: data.minStableReads,
        tareKg: data.tareKg,
        active: data.active
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "scale",
        action: "scale_device_create",
        entityType: "ScaleDevice",
        entityId: device.id,
        metadata: {
          name: device.name,
          identifier: device.identifier,
          modelName: device.modelName,
          connectionType: device.connectionType
        }
      }
    });

    return device;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ja existe uma balanca com esse identificador.");
    }

    throw error;
  }
}

export async function updateScaleDevice(id: string, data: ScaleDeviceInput, userId: string) {
  try {
    const device = await db.scaleDevice.update({
      where: {
        id
      },
      data: {
        name: data.name.trim(),
        identifier: data.identifier.trim(),
        modelName: cleanOptional(data.modelName),
        connectionType: data.connectionType,
        port: cleanOptional(data.port),
        baudRate: typeof data.baudRate === "number" ? data.baudRate : null,
        endpoint: cleanOptional(data.endpoint),
        stabilityMs: data.stabilityMs,
        minStableReads: data.minStableReads,
        tareKg: data.tareKg,
        active: data.active
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "scale",
        action: "scale_device_update",
        entityType: "ScaleDevice",
        entityId: device.id,
        metadata: {
          name: device.name,
          identifier: device.identifier,
          modelName: device.modelName,
          connectionType: device.connectionType,
          stabilityMs: device.stabilityMs,
          minStableReads: device.minStableReads,
          tareKg: Number(device.tareKg),
          active: device.active
        }
      }
    });

    return device;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ja existe uma balanca com esse identificador.");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Balanca nao encontrada.");
    }

    throw error;
  }
}
