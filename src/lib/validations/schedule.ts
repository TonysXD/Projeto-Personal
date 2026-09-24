import { z } from "zod";

export const slotFormSchema = z
  .object({
    student_id: z.string().min(1, "Selecione um aluno."),
    weekday: z.coerce.number().int().min(0).max(6, "Dia da semana inválido."),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário final inválido."),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "O horário final deve ser depois do inicial.",
    path: ["end_time"],
  });

export const appointmentFormSchema = z
  .object({
    student_id: z.string().min(1, "Selecione um aluno."),
    appointment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário final inválido."),
    notes: z.string().optional().default(""),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "O horário final deve ser depois do inicial.",
    path: ["end_time"],
  });