import { createClient } from "@/lib/supabase/server";
import ScheduleClient from "@/components/appointments/ScheduleClient";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const [{ data: slots }, { data: appointments }, { data: students }] =
    await Promise.all([
      supabase
        .from("schedule_slots")
        .select("id, student_id, weekday, start_time, end_time, active, reason")
        .order("start_time", { ascending: true }),
      supabase
        .from("appointments")
        .select("id, student_id, appointment_date, start_time, end_time, status, notes, active, reason")
        .order("appointment_date", { ascending: false }),
      supabase
        .from("students")
        .select("id, name, photo_url, status"),
    ]);

  return (
    <ScheduleClient
      initialSlots={slots ?? []}
      initialAppointments={appointments ?? []}
      students={students ?? []}
    />
  );
}