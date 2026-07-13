import { z } from "zod";

const optionalText = z.string().trim().max(180).optional().or(z.literal(""));

export const scaleDeviceSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da balanca.").max(120),
  identifier: z.string().trim().min(3, "Informe um identificador unico.").max(80),
  modelName: optionalText,
  connectionType: z.enum(["serial", "usb", "api", "manual"], {
    required_error: "Selecione o tipo de conexao."
  }),
  port: optionalText,
  baudRate: z.coerce.number().int().positive().optional().or(z.literal("")),
  endpoint: optionalText,
  stabilityMs: z.coerce.number().int().min(300, "Informe ao menos 300 ms.").max(10000).default(1500),
  minStableReads: z.coerce.number().int().min(1, "Informe ao menos 1 leitura.").max(20).default(3),
  tareKg: z.coerce.number().min(0, "A tara nao pode ser negativa.").max(100).default(0),
  active: z.boolean().default(true)
});

export type ScaleDeviceInput = z.infer<typeof scaleDeviceSchema>;
