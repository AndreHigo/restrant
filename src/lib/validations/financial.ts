import { z } from "zod";

export const payAccountPayableSchema = z.object({
  accountPayableId: z.string().min(1, "Selecione a conta a pagar."),
  amount: z.coerce.number().positive("Informe um valor pago valido.").optional(),
  notes: z.string().optional().default("")
});

export const receiveAccountReceivableSchema = z.object({
  accountReceivableId: z.string().min(1, "Selecione a conta a receber."),
  amount: z.coerce.number().positive("Informe um valor recebido valido.").optional(),
  notes: z.string().optional().default("")
});

export const paymentMethodReconciliationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data valida."),
  method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER", "BANK_TRANSFER"]),
  expectedAmount: z.coerce.number().min(0, "Informe o valor esperado."),
  countedAmount: z.coerce.number().min(0, "Informe o valor conferido."),
  notes: z.string().optional().default("")
});
