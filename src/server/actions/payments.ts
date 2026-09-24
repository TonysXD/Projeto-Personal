"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { paymentFormSchema } from "@/lib/validations/payment";
import { formatZodErrors } from "@/lib/validations/student";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return supabase;
}

export async function createPaymentAction(input: unknown) {
  const supabase = await requireUser();
  const parsed = paymentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodErrors(parsed.error) };
  }
  const data = parsed.data;

  const { error } = await supabase.from("payments").insert({
    student_id: data.student_id,
    due_date: data.due_date,
    amount: data.amount,
    method: data.method || null,
    status: "pendente",
    notes: data.notes || null,
  });

  if (error) return { ok: false as const, error: "Não foi possível salvar o pagamento." };

  revalidatePath("/admin/payments");
  return { ok: true as const };
}

export async function markPaymentAsPaidAction(paymentId: string) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("payments")
    .update({ status: "pago", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false as const, error: "Não foi possível atualizar o pagamento." };

  revalidatePath("/admin/payments");
  return { ok: true as const };
}