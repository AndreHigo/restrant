import { z } from "zod";
import { securePasswordSchema } from "@/lib/password-policy";

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

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(24, "Token invalido."),
    newPassword: securePasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a nova senha.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmacao precisa ser igual a nova senha.",
    path: ["confirmPassword"]
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
