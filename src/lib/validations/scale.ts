import { z } from "zod";

const optionalText = z.string().trim().max(180).optional().or(z.literal(""));

export const scaleDeviceSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da balanca.").max(120),
  identifier: z.string().trim().min(3, "Informe um identificador unico.").max(80),
  connectionType: z.enum(["serial", "usb", "api", "manual"], {
    required_error: "Selecione o tipo de conexao."
  }),
  port: optionalText,
  baudRate: z.coerce.number().int().positive().optional().or(z.literal("")),
  endpoint: optionalText,
  active: z.boolean().default(true)
});

export type ScaleDeviceInput = z.infer<typeof scaleDeviceSchema>;
