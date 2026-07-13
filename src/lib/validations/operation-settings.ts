import { z } from "zod";

export const operationSettingsSchema = z.object({
  enableBuffetKg: z.boolean(),
  enablePratoFeito: z.boolean(),
  enableKitchen: z.boolean(),
  enableCounter: z.boolean(),
  enableTakeout: z.boolean(),
  enableDelivery: z.boolean(),
  enableTableService: z.boolean(),
  allowManualWeightInput: z.boolean(),
  requireWeightChangeReason: z.boolean(),
  requireCancelReason: z.boolean(),
  allowPartialPayments: z.boolean(),
  requireOpenCashRegister: z.boolean(),
  serviceChargePercent: z.coerce
    .number()
    .min(0, "Informe uma taxa de servico entre 0 e 100%.")
    .max(100, "Informe uma taxa de servico entre 0 e 100%."),
  enableAutoStockDeduction: z.boolean(),
  blockOutOfStockSales: z.boolean(),
  serviceModeNotes: z.string().trim().max(500, "Use no maximo 500 caracteres.").optional().or(z.literal(""))
});

export type OperationSettingsInput = z.infer<typeof operationSettingsSchema>;
