"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Slot = {
  id: string;
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
  reason: string | null;
};

type Appointment = {
  id: string;
  student_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  active: boolean;
  reason: string | null;
};

type Student = {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
};

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    agendado: { label: "Agendado", cls: "bg-blue-100 text-blue-800" },
    reagendado: { label: "Reagendado", cls: "bg-amber-100 text-amber-800" },
    cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
    concluido: { label: "Concluído", cls: "bg-green-100 text-green-800" },
  };
  const s = map[status] ?? map.agendado;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function ScheduleClient({
  initialSlots,
  initialAppointments,
  students,
}: {
  initialSlots: Slot[];
  initialAppointments: Appointment[];
  students: Student[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [view, setView] = useState<"semana" | "avulsos">("semana");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"fixo" | "avulso">("fixo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [savingReasonId, setSavingReasonId] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    weekday: "1",
    start_time: "08:00",
    end_time: "09:00",
    appointment_date: todayISO(),
    notes: "",
  });

  const today = todayISO();

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  function openModal(mode: "fixo" | "avulso") {
    setModalMode(mode);
    setError(null);
    setForm((f) => ({
      ...f,
      student_id: students[0]?.id ?? "",
      start_time: "08:00",
      end_time: "09:00",
    }));
    setModalOpen(true);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!form.student_id) {
      setError("Selecione um aluno.");
      return;
    }
    if (form.start_time >= form.end_time) {
      setError("O horário final deve ser depois do inicial.");
      return;
    }
    setSaving(true);

    if (modalMode === "fixo") {
      const { data, error: err } = await supabase
        .from("schedule_slots")
        .insert({
          student_id: form.student_id,
          weekday: parseInt(form.weekday),
          start_time: form.start_time,
          end_time: form.end_time,
          active: true,
        })
        .select()
        .single();
      if (!err && data) {
        setSlots((prev) => [...prev, data]);
        setModalOpen(false);
      } else {
        setError("Não foi possível salvar: " + (err?.message ?? "erro desconhecido"));
      }
    } else {
      const { data, error: err } = await supabase
        .from("appointments")
        .insert({
          student_id: form.student_id,
          appointment_date: form.appointment_date,
          start_time: form.start_time,
          end_time: form.end_time,
          status: "agendado",
          notes: form.notes || null,
          active: true,
        })
        .select()
        .single();
      if (!err && data) {
        setAppointments((prev) => [data, ...prev]);
        setModalOpen(false);
      } else {
        setError("Não foi possível salvar: " + (err?.message ?? "erro desconhecido"));
      }
    }

    setSaving(false);
    router.refresh();
  }

  // ===== Horários fixos =====

  async function deactivateSlot(slot: Slot) {
    const { data, error: err } = await supabase
      .from("schedule_slots")
      .update({ active: false })
      .eq("id", slot.id)
      .select()
      .single();
    if (!err && data) {
      setSlots((prev) => prev.map((x) => (x.id === slot.id ? data : x)));
    } else {
      setError("Não foi possível desativar: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  async function saveReason(slot: Slot) {
    const reason = (reasonDrafts[slot.id] ?? "").trim();
    setSavingReasonId(slot.id);
    const { data, error: err } = await supabase
      .from("schedule_slots")
      .update({ reason: reason || null })
      .eq("id", slot.id)
      .select()
      .single();
    if (!err && data) {
      setSlots((prev) => prev.map((x) => (x.id === slot.id ? data : x)));
      setReasonDrafts((prev) => {
        const next = { ...prev };
        delete next[slot.id];
        return next;
      });
    } else {
      setError("Não foi possível salvar o motivo: " + (err?.message ?? "erro desconhecido"));
    }
    setSavingReasonId(null);
    router.refresh();
  }

  async function reactivateSlot(slot: Slot) {
    const { data, error: err } = await supabase
      .from("schedule_slots")
      .update({ active: true, reason: null })
      .eq("id", slot.id)
      .select()
      .single();
    if (!err && data) {
      setSlots((prev) => prev.map((x) => (x.id === slot.id ? data : x)));
      setReasonDrafts((prev) => {
        const next = { ...prev };
        delete next[slot.id];
        return next;
      });
    } else {
      setError("Não foi possível reativar: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  async function removeSlot(slot: Slot) {
    if (!confirm("Remover este horário fixo da grade?")) return;
    const { error: err } = await supabase.from("schedule_slots").delete().eq("id", slot.id);
    if (!err) {
      setSlots((prev) => prev.filter((x) => x.id !== slot.id));
    } else {
      setError("Não foi possível remover: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  // ===== Agendamentos avulsos =====

  async function deactivateAppointment(app: Appointment) {
    const { data, error: err } = await supabase
      .from("appointments")
      .update({ active: false })
      .eq("id", app.id)
      .select()
      .single();
    if (!err && data) {
      setAppointments((prev) => prev.map((x) => (x.id === app.id ? data : x)));
    } else {
      setError("Não foi possível desativar: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  async function saveAppointmentReason(app: Appointment) {
    const reason = (reasonDrafts[app.id] ?? "").trim();
    setSavingReasonId(app.id);
    const { data, error: err } = await supabase
      .from("appointments")
      .update({ reason: reason || null })
      .eq("id", app.id)
      .select()
      .single();
    if (!err && data) {
      setAppointments((prev) => prev.map((x) => (x.id === app.id ? data : x)));
      setReasonDrafts((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    } else {
      setError("Não foi possível salvar o motivo: " + (err?.message ?? "erro desconhecido"));
    }
    setSavingReasonId(null);
    router.refresh();
  }

  async function reactivateAppointment(app: Appointment) {
    const { data, error: err } = await supabase
      .from("appointments")
      .update({ active: true, reason: null })
      .eq("id", app.id)
      .select()
      .single();
    if (!err && data) {
      setAppointments((prev) => prev.map((x) => (x.id === app.id ? data : x)));
      setReasonDrafts((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    } else {
      setError("Não foi possível reativar: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  async function updateAppointmentStatus(app: Appointment, status: string) {
    const { data, error: err } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", app.id)
      .select()
      .single();
    if (!err && data) {
      setAppointments((prev) => prev.map((x) => (x.id === app.id ? data : x)));
    } else {
      setError("Não foi possível atualizar: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  async function removeAppointment(app: Appointment) {
    if (!confirm("Excluir este agendamento?")) return;
    const { error: err } = await supabase.from("appointments").delete().eq("id", app.id);
    if (!err) {
      setAppointments((prev) => prev.filter((x) => x.id !== app.id));
    } else {
      setError("Não foi possível excluir: " + (err?.message ?? "erro desconhecido"));
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Agenda</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openModal("fixo")}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            + Horário fixo
          </button>
          <button
            onClick={() => openModal("avulso")}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            + Agendamento avulso
          </button>
        </div>
      </div>

      {/* Abas de visão */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        <button
          onClick={() => setView("semana")}
          className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            view === "semana"
              ? "border-red-600 text-red-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Grade da semana
        </button>
        <button
          onClick={() => setView("avulsos")}
          className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            view === "avulsos"
              ? "border-red-600 text-red-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Agendamentos avulsos
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {view === "semana" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const daySlots = slots.filter((s) => s.weekday === day);
            return (
              <div key={day} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-900">{WEEKDAYS[day]}</h3>
                {daySlots.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-400">Sem horários</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {daySlots.map((slot) => {
                      const student = studentsById.get(slot.student_id);
                      const isActive = slot.active;
                      const draft = reasonDrafts[slot.id] ?? slot.reason ?? "";
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            isActive
                              ? "border-green-200 bg-green-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isActive ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              <p
                                className={`text-sm font-semibold ${
                                  isActive ? "text-green-900" : "text-red-900"
                                }`}
                              >
                                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {isActive ? (
                                <button
                                  onClick={() => deactivateSlot(slot)}
                                  title="Desativar"
                                  className="rounded p-1 text-green-600 transition hover:bg-green-100"
                                >
                                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivateSlot(slot)}
                                  title="Reativar"
                                  className="rounded p-1 text-red-600 transition hover:bg-red-100"
                                >
                                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => removeSlot(slot)}
                                title="Remover"
                                className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <p className={`mt-1 text-sm ${isActive ? "text-green-800" : "text-red-800"}`}>
                            {student?.name ?? "Aluno removido"}
                          </p>

                          {!isActive && (
                            <div className="mt-2">
                              <label
                                htmlFor={`reason-${slot.id}`}
                                className="block text-xs font-semibold text-red-700"
                              >
                                Motivo da desativação
                              </label>
                              <div className="mt-1 flex gap-1.5">
                                <input
                                  id={`reason-${slot.id}`}
                                  type="text"
                                  value={draft}
                                  onChange={(e) =>
                                    setReasonDrafts((prev) => ({
                                      ...prev,
                                      [slot.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveReason(slot);
                                  }}
                                  placeholder="ex.: aluno viajou, férias..."
                                  className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => saveReason(slot)}
                                  disabled={savingReasonId === slot.id}
                                  title="Salvar motivo"
                                  className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                >
                                  {savingReasonId === slot.id ? "..." : "Salvar"}
                                </button>
                              </div>
                              {slot.reason && (
                                <p className="mt-1 text-xs italic text-red-700">
                                  ✓ {slot.reason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "avulsos" && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
              Nenhum agendamento avulso. Use "+ Agendamento avulso" para reagendar um treino pontualmente.
            </p>
          ) : (
            appointments.map((app) => {
              const student = studentsById.get(app.student_id);
              const isActive = app.active;
              const draft = reasonDrafts[app.id] ?? app.reason ?? "";
              return (
                <div
                  key={app.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isActive
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {student?.photo_url ? (
                        <img src={student.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-500">
                          {student?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <p className={`font-medium ${isActive ? "text-green-900" : "text-red-900"}`}>
                          {student?.name ?? "Aluno removido"}
                        </p>
                        <p className={`text-sm ${isActive ? "text-green-800" : "text-red-800"}`}>
                          {formatDateBR(app.appointment_date)} · {formatTime(app.start_time)} – {formatTime(app.end_time)}
                          {app.notes ? ` · ${app.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={app.status} />
                      {isActive ? (
                        <button
                          onClick={() => deactivateAppointment(app)}
                          className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateAppointment(app)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Reativar
                        </button>
                      )}
                      {app.status === "agendado" && isActive && (
                        <button
                          onClick={() => updateAppointmentStatus(app, "concluido")}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                        >
                          Concluir
                        </button>
                      )}
                      <button
                        onClick={() => removeAppointment(app)}
                        aria-label="Excluir agendamento"
                        className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {!isActive && (
                    <div className="mt-3">
                      <label
                        htmlFor={`app-reason-${app.id}`}
                        className="block text-xs font-semibold text-red-700"
                      >
                        Motivo da desativação
                      </label>
                      <div className="mt-1 flex gap-1.5">
                        <input
                          id={`app-reason-${app.id}`}
                          type="text"
                          value={draft}
                          onChange={(e) =>
                            setReasonDrafts((prev) => ({
                              ...prev,
                              [app.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAppointmentReason(app);
                          }}
                          placeholder="ex.: aluno viajou, reagendado..."
                          className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none"
                        />
                        <button
                          onClick={() => saveAppointmentReason(app)}
                          disabled={savingReasonId === app.id}
                          title="Salvar motivo"
                          className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {savingReasonId === app.id ? "..." : "Salvar"}
                        </button>
                      </div>
                      {app.reason && (
                        <p className="mt-1 text-xs italic text-red-700">
                          ✓ {app.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAdd} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">
              {modalMode === "fixo" ? "Novo horário fixo" : "Novo agendamento avulso"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {modalMode === "fixo"
                ? "Repete toda semana no dia e horário escolhidos."
                : "Compromisso pontual em uma data específica (ex.: reagendamento)."}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="sch-student" className={labelClasses}>Aluno *</label>
                <select
                  id="sch-student"
                  className={inputClasses}
                  value={form.student_id}
                  onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status !== "ativo" ? "(inativo)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {modalMode === "fixo" ? (
                <div>
                  <label htmlFor="sch-weekday" className={labelClasses}>Dia da semana *</label>
                  <select
                    id="sch-weekday"
                    className={inputClasses}
                    value={form.weekday}
                    onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
                  >
                    {WEEKDAYS_SHORT.map((name, i) => (
                      <option key={i} value={String(i)}>{name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="sch-date" className={labelClasses}>Data *</label>
                  <input
                    id="sch-date"
                    type="date"
                    className={inputClasses}
                    value={form.appointment_date}
                    onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sch-start" className={labelClasses}>Início *</label>
                  <input
                    id="sch-start"
                    type="time"
                    className={inputClasses}
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="sch-end" className={labelClasses}>Fim *</label>
                  <input
                    id="sch-end"
                    type="time"
                    className={inputClasses}
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              {modalMode === "avulso" && (
                <div>
                  <label htmlFor="sch-notes" className={labelClasses}>Observações</label>
                  <input
                    id="sch-notes"
                    className={inputClasses}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="opcional"
                  />
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}