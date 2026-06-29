import { z } from "zod";

const optionalText = z.string().trim().max(120).optional().or(z.literal(""));

export const companyFiscalSettingsSchema = z.object({
  legalName: z.string().trim().min(3, "Informe a razao social.").max(160),
  tradeName: z.string().trim().min(2, "Informe o nome fantasia.").max(120),
  document: z.string().trim().min(14, "Informe um CNPJ valido.").max(18),
  stateTaxId: optionalText,
  cityTaxId: optionalText,
  email: z.string().trim().email("Informe um e-mail valido.").optional().or(z.literal("")),
  phone: optionalText,
  addressLine: optionalText,
  city: optionalText,
  state: z.string().trim().min(2, "Informe a UF.").max(2, "Use a sigla da UF."),
  zipCode: optionalText,
  fiscalEnvironment: z.enum(["homologacao", "producao"], {
    required_error: "Selecione o ambiente fiscal."
  })
});

export type CompanyFiscalSettingsInput = z.infer<typeof companyFiscalSettingsSchema>;
