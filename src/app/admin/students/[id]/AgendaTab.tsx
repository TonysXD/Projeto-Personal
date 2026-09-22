"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";

/* ============================================================
   Aba Agenda — horários fixos e agendamentos do aluno no perfil
   ============================================================ */

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Slot = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
  reason: string | null;
};

type Appointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  active: boolean;
  reason: string | null;
  notes: string | null;
};

function formatTime(t?: string | null) {
  return t?.slice(0, 5) ?? "--:--";
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  agendado: { label: "Agendado", cls: "bg-blue-100 text-blue-800" },
  reagendado: { label: "Reagendado", cls: "bg-amber-100 text-amber-800" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
  concluido: { label: "Concluído", cls: "bg-green-100 text-green-800" },
};

export default function AgendaTab({ studentId }: { studentId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("schedule_slots")
        .select("*")
        .eq("student_id", studentId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("appointments")
        .select("*")
        .eq("student_id", studentId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false }),
    ]).then(([slotsRes, appsRes]) => {
      if (!slotsRes.error) setSlots((slotsRes.data ?? []) as Slot[]);
      if (!appsRes.error) setAppointments((appsRes.data ?? []) as Appointment[]);
      setLoading(false);
    });
  }, [studentId, supabase]);

  async function toggleSlot(slot: Slot) {
    const next = !slot.active;
    const { data, error } = await supabase
      .from("schedule_slots")
      .update({ active: next })
      .eq("id", slot.id)
      .select()
      .single();
    if (!error && data) {
      setSlots((prev) => prev.map((x) => (x.id === slot.id ? (data as Slot) : x)));
      router.refresh();
    }
  }

  async function toggleAppointment(app: Appointment) {
    const next = !app.active;
    const { data, error } = await supabase
      .from("appointments")
      .update({ active: next })
      .eq("id", app.id)
      .select()
      .single();
    if (!error && data) {
      setAppointments((prev) => prev.map((x) => (x.id === app.id ? (data as Appointment) : x)));
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-40 rounded-xl bg-neutral-100" />
        <div className="h-40 rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== Horários fixos ===== */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Horários fixos</h2>
        <p className="text-sm text-neutral-500">Aulas que se repetem toda semana.</p>

        {slots.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            Nenhum horário fixo para este aluno.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`rounded-xl border p-4 transition-colors ${
                  slot.active ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        slot.active ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className={`font-semibold ${slot.active ? "text-green-900" : "text-red-900"}`}>
                        {WEEKDAYS[slot.weekday]}
                      </p>
                      <p className={`text-sm ${slot.active ? "text-green-800" : "text-red-800"}`}>
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      slot.active
                        ? "border-green-300 text-green-700 hover:bg-green-100"
                        : "border-red-300 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {slot.active ? "Desativar" : "Reativar"}
                  </button>
                </div>
                {!slot.active && slot.reason && (
                  <p className="mt-2 text-xs italic text-red-700">Motivo: {slot.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Agendamentos ===== */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Agendamentos</h2>
        <p className="text-sm text-neutral-500">Aulas avulsas em datas específicas.</p>

        {appointments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            Nenhum agendamento para este aluno.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {appointments.map((app) => {
              const status = STATUS_META[app.status] ?? STATUS_META.agendado;
              return (
                <div
                  key={app.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    app.active ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          app.active ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className={`font-semibold ${app.active ? "text-green-900" : "text-red-900"}`}>
                          {formatDateBR(app.appointment_date)}
                        </p>
                        <p className={`text-sm ${app.active ? "text-green-800" : "text-red-800"}`}>
                          {formatTime(app.start_time)} – {formatTime(app.end_time)}
                          {app.notes ? ` · ${app.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAppointment(app)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          app.active
                            ? "border-green-300 text-green-700 hover:bg-green-100"
                            : "border-red-300 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {app.active ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </div>
                  {!app.active && app.reason && (
                    <p className="mt-2 text-xs italic text-red-700">Motivo: {app.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}