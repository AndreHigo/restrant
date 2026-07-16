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
  }),
  fiscalIntegrationMode: z.enum(["SVRS_DIRECT", "PROVIDER"]).default("SVRS_DIRECT"),
  fiscalWebserviceUf: z.string().trim().min(2, "Informe a UF autorizadora.").max(2, "Use a sigla da UF."),
  nfceSeries: z.string().trim().min(1, "Informe a serie NFC-e.").max(3, "Serie deve ter ate 3 digitos."),
  nfceNextNumber: z.coerce.number().int().min(1, "Informe o proximo numero NFC-e."),
  nfceCscId: optionalText,
  nfceCscToken: z.string().trim().max(64).optional().or(z.literal("")),
  fiscalCertificateName: optionalText,
  fiscalCertificatePassword: z.string().trim().max(120).optional().or(z.literal(""))
});

export const nfcePrepareSchema = z.object({
  salesOrderId: z.string().min(1, "Selecione uma venda para emitir NFC-e.")
});

export const nfceStatusCheckSchema = z.object({
  environment: z.enum(["homologacao", "producao"]).optional()
});

export const nfceSignSchema = z.object({
  fiscalDocumentId: z.string().min(1, "Selecione uma NFC-e para assinar.")
});

export type CompanyFiscalSettingsInput = z.infer<typeof companyFiscalSettingsSchema>;
export type NfcePrepareInput = z.infer<typeof nfcePrepareSchema>;
export type NfceSignInput = z.infer<typeof nfceSignSchema>;
export type NfceStatusCheckInput = z.infer<typeof nfceStatusCheckSchema>;
