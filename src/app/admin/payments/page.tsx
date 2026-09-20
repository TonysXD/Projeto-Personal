import { createClient } from "@/lib/supabase/server";
import PaymentsClient from "./PaymentsClient";

export default async function PaymentsPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: students }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, student_id, due_date, amount, method, status, paid_at, notes, created_at")
      .order("due_date", { ascending: false }),
    supabase
      .from("students")
      .select("id, name, photo_url, status, plan_name, plan_price, plan_end")
      .order("name", { ascending: true }),
  ]);

  return (
    <PaymentsClient
      initialPayments={payments ?? []}
      students={students ?? []}
    />
  );
}