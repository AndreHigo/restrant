import { db } from "@/lib/db";
import type { OperationSettingsInput } from "@/lib/validations/operation-settings";

const defaultCompany = {
  id: "default-company",
  legalName: "Restaurant Brasil Tecnologia Ltda",
  tradeName: "Restaurant Brasil",
  document: "12.345.678/0001-90",
  stateTaxId: "123456789",
  email: "contato@restaurantebrasil.local",
  phone: "(11) 99999-0000",
  addressLine: "Rua das Palmeiras, 120",
  city: "Sao Paulo",
  state: "SP",
  zipCode: "01000-000"
};

export async function getOperationSettings() {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  return {
    enableBuffetKg: company?.enableBuffetKg ?? true,
    enablePratoFeito: company?.enablePratoFeito ?? true,
    enableKitchen: company?.enableKitchen ?? true,
    enableCounter: company?.enableCounter ?? true,
    enableTakeout: company?.enableTakeout ?? true,
    enableDelivery: company?.enableDelivery ?? false,
    enableTableService: company?.enableTableService ?? false,
    allowManualWeightInput: company?.allowManualWeightInput ?? true,
    requireWeightChangeReason: company?.requireWeightChangeReason ?? true,
    requireCancelReason: company?.requireCancelReason ?? true,
    allowPartialPayments: company?.allowPartialPayments ?? true,
    requireOpenCashRegister: company?.requireOpenCashRegister ?? true,
    enableAutoStockDeduction: company?.enableAutoStockDeduction ?? true,
    blockOutOfStockSales: company?.blockOutOfStockSales ?? true,
    serviceModeNotes: company?.serviceModeNotes ?? ""
  };
}

export async function updateOperationSettings(data: OperationSettingsInput, userId: string) {
  const existing = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  const payload = {
    enableBuffetKg: data.enableBuffetKg,
    enablePratoFeito: data.enablePratoFeito,
    enableKitchen: data.enableKitchen,
    enableCounter: data.enableCounter,
    enableTakeout: data.enableTakeout,
    enableDelivery: data.enableDelivery,
    enableTableService: data.enableTableService,
    allowManualWeightInput: data.allowManualWeightInput,
    requireWeightChangeReason: data.requireWeightChangeReason,
    requireCancelReason: data.requireCancelReason,
    allowPartialPayments: data.allowPartialPayments,
    requireOpenCashRegister: data.requireOpenCashRegister,
    enableAutoStockDeduction: data.enableAutoStockDeduction,
    blockOutOfStockSales: data.blockOutOfStockSales,
    serviceModeNotes: data.serviceModeNotes?.trim() || null
  };

  const company = existing
    ? await db.companySetting.update({
        where: {
          id: existing.id
        },
        data: payload
      })
    : await db.companySetting.create({
        data: {
          ...defaultCompany,
          ...payload
        }
      });

  await db.auditLog.create({
    data: {
      userId,
      module: "settings",
      action: "operation_settings_update",
      entityType: "CompanySetting",
      entityId: company.id,
      metadata: payload
    }
  });

  return company;
}
