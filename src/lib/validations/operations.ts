import { z } from "zod";

export const salesOrderCreateSchema = z
  .object({
    channel: z.enum(["POS", "TABLE", "TAB", "COUNTER", "TAKEOUT", "DELIVERY"]),
    customerId: z.string().optional().default(""),
    tableId: z.string().optional().default(""),
    tabId: z.string().optional().default(""),
    tabCode: z.string().optional().default(""),
    notes: z.string().optional().default(""),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Selecione um produto."),
          quantity: z.coerce.number().positive("Informe uma quantidade valida."),
          weightKg: z.coerce.number().positive().optional(),
          scaleReadingId: z.string().optional().default(""),
          notes: z.string().optional().default("")
        })
      )
      .min(1, "Adicione pelo menos um item ao pedido.")
  })
  .superRefine((data, ctx) => {
    if (data.channel === "TABLE" && !data.tableId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione uma mesa para pedidos neste canal.",
        path: ["tableId"]
      });
    }

    if (data.channel === "TAB" && !data.tabId && !data.tabCode.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o numero da comanda para pedidos neste canal.",
        path: ["tabCode"]
      });
    }

    if (data.channel === "DELIVERY" && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione um cliente para pedidos de delivery.",
        path: ["customerId"]
      });
    }
  });

export const scaleReadingCreateSchema = z.object({
  productId: z.string().min(1, "Selecione um produto pesavel."),
  scaleDeviceId: z.string().optional().default(""),
  weightKg: z.coerce.number().positive("Informe um peso valido.").optional(),
  sourceMode: z.enum(["MANUAL", "DEVICE"]).default("MANUAL"),
  notes: z.string().optional().default("")
});

export const scaleLaunchSchema = z
  .object({
    productId: z.string().min(1, "Selecione um produto pesavel."),
    targetType: z.enum(["COUNTER", "TABLE", "TAB"]),
    targetId: z.string().optional().default(""),
    targetCode: z.string().optional().default(""),
    scaleDeviceId: z.string().optional().default(""),
    weightKg: z.coerce.number().positive("Informe um peso valido.").optional(),
    sourceMode: z.enum(["MANUAL", "DEVICE"]).default("MANUAL"),
    notes: z.string().optional().default("")
  })
  .superRefine((data, ctx) => {
    if ((data.targetType === "TABLE" || data.targetType === "TAB") && !data.targetId && !data.targetCode.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a mesa ou comanda para lancar o item pesado.",
        path: ["targetCode"]
      });
    }
  });

export const orderStatusSchema = z
  .object({
    salesOrderId: z.string().min(1),
    status: z.enum(["OPEN", "PREPARING", "READY", "DELIVERED", "PAID", "CANCELED"]),
    cancelReason: z.string().optional().default("")
  })
  .superRefine((data, ctx) => {
    if (data.status === "CANCELED" && data.cancelReason.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um motivo de cancelamento com pelo menos 5 caracteres.",
        path: ["cancelReason"]
      });
    }
  });

export const orderItemCancelSchema = z.object({
  salesOrderItemId: z.string().min(1),
  cancelReason: z.string().min(5, "Informe um motivo de cancelamento com pelo menos 5 caracteres.")
});

export const orderPaymentSchema = z.object({
  salesOrderId: z.string().min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER", "BANK_TRANSFER"]),
        amount: z.coerce.number().positive("Informe um valor valido.")
      })
    )
    .min(1, "Adicione pelo menos uma forma de pagamento.")
});

export const cashRegisterOpenSchema = z.object({
  openingAmount: z.coerce.number().min(0, "Informe um valor inicial valido."),
  notes: z.string().optional().default("")
});

export const cashMovementSchema = z.object({
  type: z.enum(["SUPPLY", "WITHDRAWAL"]),
  amount: z.coerce.number().positive("Informe um valor valido."),
  reason: z.string().min(3, "Informe o motivo da movimentacao.")
});

export const cashRegisterCloseSchema = z.object({
  closingAmount: z.coerce.number().min(0, "Informe o valor contado no caixa."),
  notes: z.string().optional().default("")
});
