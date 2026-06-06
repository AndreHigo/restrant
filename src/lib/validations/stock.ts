import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

export const stockMovementSchema = z.object({
  ingredientId: z.string().min(1, "Selecione o insumo."),
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "LOSS", "PURCHASE"]),
  quantity: z.coerce.number().positive("Informe uma quantidade valida."),
  unitCost: emptyToUndefined(z.coerce.number().min(0).optional()),
  reason: z.string().optional().default(""),
  referenceType: z.string().optional().default(""),
  referenceId: z.string().optional().default("")
});

export const inventoryAdjustmentSchema = z.object({
  ingredientId: z.string().min(1, "Selecione o insumo."),
  countedStock: z.coerce.number().min(0, "Informe a contagem inventariada."),
  reason: z.string().optional().default("")
});

export const recipeItemSchema = z.object({
  productId: z.string().min(1, "Selecione o produto."),
  ingredientId: z.string().min(1, "Selecione o insumo."),
  quantity: z.coerce.number().positive("Informe a quantidade da ficha tecnica.")
});
