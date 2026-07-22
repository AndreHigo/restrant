import { z } from "zod";

export const passwordPolicyHint = "Use ao menos 10 caracteres, com maiuscula, minuscula, numero e simbolo.";

export const securePasswordSchema = z
  .string()
  .min(10, "A senha precisa ter ao menos 10 caracteres.")
  .max(128, "A senha precisa ter no maximo 128 caracteres.")
  .refine((value) => /[a-z]/.test(value), "A senha precisa ter uma letra minuscula.")
  .refine((value) => /[A-Z]/.test(value), "A senha precisa ter uma letra maiuscula.")
  .refine((value) => /\d/.test(value), "A senha precisa ter um numero.")
  .refine((value) => /[^A-Za-z0-9\s]/.test(value), "A senha precisa ter um simbolo.")
  .refine((value) => !/\s/.test(value), "A senha nao pode conter espacos.");
