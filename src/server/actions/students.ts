"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { studentFormSchema, formatZodErrors } from "@/lib/validations/student";
import { capitalizeName } from "@/lib/format";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { todayISO } from "@/lib/payments";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return supabase;
}

// ============ CREATE ============
export async function createStudentAction(input: unknown) {
  const supabase = await requireUser();
  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodErrors(parsed.error) };
  }
  const data = parsed.data;

  const whatsapp = normalizeWhatsApp(data.whatsapp);
  if (!whatsapp) return { ok: false as const, error: "WhatsApp inválido." };

  const { data: inserted, error } = await supabase
    .from("students")
    .insert({
      name: capitalizeName(data.name),
      birth_date: data.birth_date,
      whatsapp,
      email: data.email || null,
      gender: data.gender || null,
      neighborhood: data.neighborhood || null,
      address: data.address || null,
      goal: data.goal,
      restrictions: data.restrictions,
      fitness_level: data.fitness_level || null,
      training_experience: data.training_experience || null,
      weekly_frequency: data.weekly_frequency
        ? Number(data.weekly_frequency)
        : null,
      plan_name: data.plan_name,
      plan_price: data.plan_price,
      plan_start: data.plan_start,
      plan_end: data.plan_end,
      status: "ativo",
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: "Não foi possível salvar o aluno." };

  revalidatePath("/admin/students");
  return { ok: true as const, id: inserted.id };
}

// ============ UPDATE ============
export async function updateStudentAction(id: string, input: unknown) {
  const supabase = await requireUser();
  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodErrors(parsed.error) };
  }
  const data = parsed.data;

  const whatsapp = normalizeWhatsApp(data.whatsapp);
  if (!whatsapp) return { ok: false as const, error: "WhatsApp inválido." };

  const { error } = await supabase
    .from("students")
    .update({
      name: capitalizeName(data.name),
      birth_date: data.birth_date,
      whatsapp,
      email: data.email || null,
      gender: data.gender || null,
      neighborhood: data.neighborhood || null,
      address: data.address || null,
      goal: data.goal,
      restrictions: data.restrictions,
      fitness_level: data.fitness_level || null,
      training_experience: data.training_experience || null,
      weekly_frequency: data.weekly_frequency
        ? Number(data.weekly_frequency)
        : null,
      plan_name: data.plan_name,
      plan_price: data.plan_price,
      plan_start: data.plan_start,
      plan_end: data.plan_end,
      notes: data.notes || null,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: "Não foi possível atualizar o aluno." };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  return { ok: true as const };
}

// ============ DELETE ============
export async function deleteStudentAction(id: string) {
  const supabase = await requireUser();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    return {
      ok: false as const,
      error:
        "Não foi possível excluir. Verifique se o aluno não possui registros vinculados (pagamentos, agenda, evolução).",
    };
  }
  revalidatePath("/admin/students");
  return { ok: true as const };
}

// ============ INATIVAR (regra crítica) ============
export async function inactivateStudentAction(studentId: string) {
  const supabase = await requireUser();
  const today = todayISO();

  const { error: e1 } = await supabase
    .from("students")
    .update({ status: "inativo", plan_end: today })
    .eq("id", studentId);
  if (e1) return { ok: false as const, error: "Não foi possível inativar o aluno." };

  // Desativa horários fixos
  await supabase
    .from("schedule_slots")
    .update({ active: false })
    .eq("student_id", studentId)
    .eq("active", true);

  // Cancela aulas futuras
  await supabase
    .from("appointments")
    .update({ status: "cancelado", active: false })
    .eq("student_id", studentId)
    .gte("appointment_date", today)
    .in("status", ["agendado", "reagendado"]);

  // Cancela pagamentos pendentes
  await supabase
    .from("payments")
    .update({ status: "cancelado" })
    .eq("student_id", studentId)
    .eq("status", "pendente");

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true as const };
}

// ============ REATIVAR ============
export async function reactivateStudentAction(studentId: string) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("students")
    .update({ status: "ativo" })
    .eq("id", studentId);
  if (error) return { ok: false as const, error: "Não foi possível reativar o aluno." };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true as const };
}