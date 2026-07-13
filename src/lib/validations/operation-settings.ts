import { z } from "zod";

export const operationSettingsSchema = z.object({
  enableBuffetKg: z.boolean(),
  enablePratoFeito: z.boolean(),
  enableKitchen: z.boolean(),
  enableCounter: z.boolean(),
  enableTakeout: z.boolean(),
  enableDelivery: z.boolean(),
  enableTableService: z.boolean(),
  serviceModeNotes: z.string().trim().max(500, "Use no maximo 500 caracteres.").optional().or(z.literal(""))
});

export type OperationSettingsInput = z.infer<typeof operationSettingsSchema>;
