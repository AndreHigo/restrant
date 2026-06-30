import { z } from "zod";

const userIdentifierSchema = z
  .string()
  .trim()
  .min(3, "Informe o usuario com pelo menos 3 caracteres.")
  .max(160, "Informe um usuario mais curto.")
  .refine((value) => !/\s/.test(value), "O usuario nao pode conter espacos.");

export const userCreateSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do usuario.").max(120),
  email: userIdentifierSchema,
  roleId: z.string().min(1, "Selecione o perfil."),
  password: z.string().min(8, "Informe uma senha temporaria com pelo menos 8 caracteres."),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE")
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do usuario.").max(120),
  email: userIdentifierSchema,
  roleId: z.string().min(1, "Selecione o perfil."),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"])
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
