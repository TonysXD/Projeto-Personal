"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { slotFormSchema, appointmentFormSchema } from "@/lib/validations/schedule";
import { formatZodErrors } from "@/lib/validations/student";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return supabase;
}

// ============ HORÁRIOS FIXOS ============
export async function createSlotAction(input: unknown) {
  const supabase = await requireUser();
  const parsed = slotFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodErrors(parsed.error) };
  }
  const d = parsed.data;

  const { error } = await supabase.from("schedule_slots").insert({
    student_id: d.student_id,
    weekday: d.weekday,
    start_time: d.start_time,
    end_time: d.end_time,
    active: true,
  });

  if (error) return { ok: false as const, error: "Não foi possível salvar o horário." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

export async function setSlotActiveAction(
  id: string,
  active: boolean,
  reason?: string
) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("schedule_slots")
    .update({ active, reason: active ? null : reason || null })
    .eq("id", id);

  if (error) return { ok: false as const, error: "Não foi possível atualizar o horário." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

export async function deleteSlotAction(id: string) {
  const supabase = await requireUser();
  const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
  if (error) return { ok: false as const, error: "Não foi possível remover o horário." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

// ============ AGENDAMENTOS AVULSOS ============
export async function createAppointmentAction(input: unknown) {
  const supabase = await requireUser();
  const parsed = appointmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodErrors(parsed.error) };
  }
  const d = parsed.data;

  const { error } = await supabase.from("appointments").insert({
    student_id: d.student_id,
    appointment_date: d.appointment_date,
    start_time: d.start_time,
    end_time: d.end_time,
    status: "agendado",
    notes: d.notes || null,
    active: true,
  });

  if (error) return { ok: false as const, error: "Não foi possível salvar o agendamento." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

export async function setAppointmentActiveAction(
  id: string,
  active: boolean,
  reason?: string
) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("appointments")
    .update({ active, reason: active ? null : reason || null })
    .eq("id", id);

  if (error) return { ok: false as const, error: "Não foi possível atualizar o agendamento." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

export async function setAppointmentStatusAction(id: string, status: string) {
  const supabase = await requireUser();
  const allowed = ["agendado", "reagendado", "concluido", "cancelado"];
  if (!allowed.includes(status)) {
    return { ok: false as const, error: "Status inválido." };
  }
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false as const, error: "Não foi possível atualizar o status." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}

export async function deleteAppointmentAction(id: string) {
  const supabase = await requireUser();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { ok: false as const, error: "Não foi possível excluir o agendamento." };
  revalidatePath("/admin/appointments");
  return { ok: true as const };
}