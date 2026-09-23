"use server";

import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/format";
import { revalidatePath } from "next/cache";

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ActionResult = { ok: boolean; error?: string };

export async function inactivateStudentAction(studentId: string): Promise<ActionResult> {
  if (!studentId || typeof studentId !== "string") {
    return { ok: false, error: "Identificador inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autorizado." };
  }

  const reason = `Aluno inativado em ${formatDateBR(todayLocalISO())}`;

  const { error } = await supabase.rpc("inactivate_student", {
    p_student_id: studentId,
    p_reason: reason,
  });

  if (error) {
    console.error("inactivate_student error:", error);
    return { ok: false, error: "Não foi possível inativar o aluno. Tente novamente." };
  }

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function reactivateStudentAction(studentId: string): Promise<ActionResult> {
  if (!studentId || typeof studentId !== "string") {
    return { ok: false, error: "Identificador inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autorizado." };
  }

  const { error } = await supabase
    .from("students")
    .update({ status: "ativo" })
    .eq("id", studentId);

  if (error) {
    console.error("reactivate_student error:", error);
    return { ok: false, error: "Não foi possível reativar o aluno." };
  }

  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}