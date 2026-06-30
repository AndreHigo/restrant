import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

export const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  description: z.string().optional().default("")
});

export const supplierSchema = z.object({
  corporateName: z.string().min(2, "Informe a razao social."),
  tradeName: z.string().optional().default(""),
  document: z.string().optional().default(""),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  active: z.coerce.boolean().default(true)
});

export const customerSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  document: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  active: z.coerce.boolean().default(true)
});

export const employeeSchema = z.object({
  name: z.string().min(2, "Informe o nome do funcionario."),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  document: z.string().optional().default(""),
  position: z.string().min(2, "Informe o cargo."),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  hiredAt: emptyToUndefined(z.string().optional()).default("")
});

export const ingredientSchema = z.object({
  sku: z.string().min(2, "Informe o SKU."),
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
  active: z.coerce.boolean().default(true),
  trackStock: z.coerce.boolean().default(true),
  fiscalNcm: z.string().optional().default(""),
  fiscalCfop: z.string().optional().default(""),
  fiscalCest: z.string().optional().default("")
});

export const tableSchema = z.object({
  code: z.string().min(2, "Informe o codigo da mesa."),
  name: z.string().min(2, "Informe o nome da mesa."),
  seats: z.coerce.number().int().min(1, "Informe a quantidade de lugares."),
  active: z.coerce.boolean().default(true)
});

export const tabSchema = z.object({
  number: z.string().min(2, "Informe o numero da comanda."),
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
