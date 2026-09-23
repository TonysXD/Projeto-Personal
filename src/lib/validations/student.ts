import { z } from "zod";

// ============================================================
// Validações do domínio de alunos
// ============================================================

export const studentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(120, "O nome está muito longo.")
    .regex(/[a-zA-Z]/, "O nome deve conter letras."),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida."),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "WhatsApp deve ter 10 ou 11 dígitos."),
  email: z
    .union([
      z.literal(""),
      z.string().trim().email("E-mail inválido."),
    ])
    .optional()
    .default(""),
  gender: z.string().optional().default(""),
  neighborhood: z.string().optional().default(""),
  address: z.string().optional().default(""),
  goal: z.string().trim().min(3, "Informe o objetivo principal."),
  restrictions: z.string().trim().min(2, "Informe restrições ou lesões."),
  fitness_level: z.string().optional().default(""),
  training_experience: z.string().optional().default(""),
  weekly_frequency: z
    .union([
      z.literal(""),
      z.coerce.number().int().min(1).max(7),
    ])
    .optional()
    .default(""),
  plan_name: z.string().trim().min(3, "Informe o plano."),
  plan_price: z
    .string()
    .transform((v) => parseFloat(v.replace(",", ".")))
    .refine((v) => !isNaN(v) && v >= 0, "Valor do plano inválido."),
  plan_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida."),
  plan_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida."),
  notes: z.string().optional().default(""),
});

// Tira os campos que não devem ir para o banco
export const studentInsertSchema = studentFormSchema.omit({
  weekly_frequency: true,
}).extend({
  weekly_frequency: z.coerce.number().int().min(1).max(7).nullable(),
});

export type StudentFormData = z.infer<typeof studentFormSchema>;

// Formata os erros do Zod em um objeto simples
export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(" ");
}