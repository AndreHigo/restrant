import { z } from "zod";

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Selecione o fornecedor."),
  ingredientId: z.string().min(1, "Selecione o insumo."),
  quantity: z.coerce.number().positive("Informe uma quantidade valida."),
  unitPrice: z.coerce.number().min(0, "Informe um custo valido."),
  expectedAt: z.string().optional().default(""),
  notes: z.string().optional().default("")
});

export const purchaseReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "Selecione o pedido de compra.")
});
