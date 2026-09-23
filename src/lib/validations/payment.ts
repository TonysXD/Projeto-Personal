import { z } from "zod";

// ============================================================
// Validações do domínio de pagamentos
// ============================================================

export const paymentFormSchema = z.object({
  student_id: z.string().min(1, "Selecione um aluno."),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida."),
  amount: z
    .string()
    .transform((v) => parseFloat(v.replace(",", ".")))
    .refine((v) => !isNaN(v) && v > 0, "Informe um valor válido."),
  method: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const paymentInsertSchema = paymentFormSchema.transform((data) => ({
  student_id: data.student_id,
  due_date: data.due_date,
  amount: data.amount,
  method: data.method || null,
  notes: data.notes || null,
}));

export type PaymentFormData = z.infer<typeof paymentFormSchema>;