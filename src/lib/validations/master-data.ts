import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => value ?? "");

const optionalEmail = z
  .string()
  .trim()
  .email("Informe um e-mail valido.")
  .optional()
  .or(z.literal(""))
  .transform((value) => value ?? "");

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

const optionalCpfCnpj = optionalText.refine(
  (value) => {
    if (!value) {
      return true;
    }

    return [11, 14].includes(onlyDigits(value).length);
  },
  {
    message: "Informe CPF com 11 digitos ou CNPJ com 14 digitos."
  }
);

const optionalPhone = optionalText.refine(
  (value) => {
    if (!value) {
      return true;
    }

    return [10, 11].includes(onlyDigits(value).length);
  },
  {
    message: "Informe telefone com DDD."
  }
);

export const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  description: z.string().optional().default("")
});

export const supplierSchema = z.object({
  corporateName: z.string().min(2, "Informe a razao social."),
  tradeName: optionalText,
  document: optionalCpfCnpj,
  email: optionalEmail,
  phone: optionalPhone,
  contactName: optionalText,
  active: z.coerce.boolean().default(true)
});

export const customerSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  email: optionalEmail,
  phone: optionalPhone,
  document: optionalCpfCnpj,
  notes: optionalText,
  active: z.coerce.boolean().default(true)
});

export const employeeSchema = z.object({
  name: z.string().min(2, "Informe o nome do funcionario."),
  email: optionalEmail,
  phone: optionalPhone,
  document: optionalCpfCnpj,
  position: z.string().min(2, "Informe o cargo."),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  hiredAt: emptyToUndefined(z.string().optional()).default("")
});

export const ingredientSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "Informe o codigo numerico do insumo.")
    .regex(/^\d+$/, "Use apenas numeros no codigo do insumo."),
  name: z.string().min(2, "Informe o nome do insumo."),
  unit: z.string().min(1, "Informe a unidade."),
  cost: z.coerce.number().min(0, "Informe um custo valido."),
  minimumStock: z.coerce.number().min(0, "Informe o estoque minimo."),
  currentStock: z.coerce.number().min(0, "Informe o estoque atual."),
  expiresAt: emptyToUndefined(z.string().optional()).default("")
});

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "Informe o codigo numerico do produto.")
    .regex(/^\d+$/, "Use apenas numeros no codigo do produto."),
  name: z.string().min(2, "Informe o nome do produto."),
  description: z.string().optional().default(""),
  type: z.enum(["READY", "WEIGHABLE", "INGREDIENT"]).default("READY"),
  price: z.coerce.number().min(0, "Informe o preco."),
  cost: z.coerce.number().min(0, "Informe o custo."),
  pricePerKg: emptyToUndefined(z.coerce.number().min(0).optional()),
  unit: z.string().min(1, "Informe a unidade."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  productionSectorId: z.string().optional().default(""),
  sendToProduction: z.coerce.boolean().default(true),
  preparationMinutes: z.coerce.number().int().min(0, "Informe um tempo valido.").default(0),
  active: z.coerce.boolean().default(true),
  trackStock: z.coerce.boolean().default(true),
  fiscalNcm: z.string().optional().default(""),
  fiscalCfop: z.string().optional().default(""),
  fiscalCest: z.string().optional().default("")
});

export const tableSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Informe o numero da mesa.")
    .regex(/^\d+$/, "Use apenas numeros no numero da mesa."),
  name: z.string().min(2, "Informe o nome da mesa."),
  seats: z.coerce.number().int().min(1, "Informe a quantidade de lugares."),
  active: z.coerce.boolean().default(true)
});

export const tabSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Informe o numero da comanda.")
    .regex(/^\d+$/, "Use apenas numeros no numero da comanda."),
  customerName: z.string().optional().default(""),
  active: z.coerce.boolean().default(true)
});

export const paymentMethodSchema = z.object({
  name: z.string().min(2, "Informe o nome da forma de pagamento."),
  type: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER", "BANK_TRANSFER"]),
  active: z.coerce.boolean().default(true),
  requiresAuthorization: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0, "Informe a ordem.")
});
