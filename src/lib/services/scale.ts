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
      connectionType: device.connectionType,
      connectionLabel: connectionLabel(device.connectionType),
      port: device.port ?? "",
      baudRate: device.baudRate ?? null,
      endpoint: device.endpoint ?? "",
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
      userName: reading.changedBy ?? "Sistema",
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
        connectionType: data.connectionType,
        port: cleanOptional(data.port),
        baudRate: typeof data.baudRate === "number" ? data.baudRate : null,
        endpoint: cleanOptional(data.endpoint)
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
