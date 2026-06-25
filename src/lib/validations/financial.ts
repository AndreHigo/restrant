import { z } from "zod";

export const payAccountPayableSchema = z.object({
  accountPayableId: z.string().min(1, "Selecione a conta a pagar.")
});
