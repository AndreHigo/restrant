import { z } from "zod";

const userIdentifierSchema = z
  .string()
  .trim()
  .min(3, "Informe o usuario com pelo menos 3 caracteres.")
  .max(160, "Informe um usuario mais curto.")
  .refine((value) => !/\s/.test(value), "O usuario nao pode conter espacos.");

export const loginSchema = z.object({
  email: userIdentifierSchema,
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres.")
});

export const forgotPasswordSchema = z.object({
  email: userIdentifierSchema
});
