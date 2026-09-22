"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeName, formatDateBR } from "@/lib/format";
import EvolutionTab, { type EvolutionRecord } from "./EvolutionTab";
import PaymentsTab from "./PaymentsTab";
import AgendaTab from "./AgendaTab";
import DeleteStudentButton from "../DeleteStudentButton";

type Student = {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  neighborhood: string | null;
  address: string | null;
  goal: string | null;
  restrictions: string | null;
  fitness_level: string | null;
  training_experience: string | null;
  weekly_frequency: number | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_start: string | null;
  plan_end: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
};

const tabs = [
  { id: "dados", label: "Dados" },
  { id: "evolucao", label: "Evolução" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "agenda", label: "Agenda" },
  { id: "notas", label: "Notas" },
];

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-0.5 text-neutral-800">{value || "—"}</p>
    </div>
  );
}

function calcAge(birth: string) {
  const b = new Date(birth + "T12:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function StudentProfile({
  student,
  evolution,
}: {
  student: Student;
  evolution: EvolutionRecord[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("dados");
  const [status, setStatus] = useState(student.status);
  const [photoUrl, setPhotoUrl] = useState(student.photo_url);
  const [toggling, setToggling] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modal de confirmação de inativação
  const [inactivateOpen, setInactivateOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [inactivating, setInactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canInactivate = typed.trim().toUpperCase() === "INATIVAR";

  async function reactivateStudent() {
    setToggling(true);
    const { error } = await supabase
      .from("students")
      .update({ status: "ativo" })
      .eq("id", student.id);

    if (!error) {
      setStatus("ativo");
      router.refresh();
    }
    setToggling(false);
  }

  async function inactivateStudent() {
    if (!canInactivate || inactivating) return;
    setInactivating(true);
    setError(null);

    try {
      const reason = `Aluno inativado em ${formatDateBR(todayLocalISO())}`;

      // 1) Desativa horários fixos (preserva histórico, some da agenda)
      const { data: slots } = await supabase
        .from("schedule_slots")
        .select("id")
        .eq("student_id", student.id);
      if (slots && slots.length > 0) {
        await supabase
          .from("schedule_slots")
          .update({ active: false, reason })
          .in("id", slots.map((s) => s.id));
      }

      // 2) Cancela agendamentos avulsos futuros não concluídos (data >= hoje)
      const { data: apps } = await supabase
        .from("appointments")
        .select("id")
        .eq("student_id", student.id)
        .gte("appointment_date", todayLocalISO())
        .neq("status", "concluido");
      if (apps && apps.length > 0) {
        await supabase
          .from("appointments")
          .update({ status: "cancelado", active: false, reason })
          .in("id", apps.map((a) => a.id));
      }

      // 3) Cancela pagamentos pendentes (nunca apaga histórico financeiro)
      const { data: pending } = await supabase
        .from("payments")
        .select("id, notes")
        .eq("student_id", student.id)
        .eq("status", "pendente");
      if (pending && pending.length > 0) {
        for (const p of pending) {
          const suffix = `— Cancelado: aluno inativado em ${formatDateBR(todayLocalISO())}`;
          const notes = p.notes ? `${p.notes} ${suffix}` : suffix;
          await supabase
            .from("payments")
            .update({ status: "cancelado", notes })
            .eq("id", p.id);
        }
      }

      // 4) Encerra a vigência do plano na data atual, se ainda ativa
      const { data: cur } = await supabase
        .from("students")
        .select("plan_end")
        .eq("id", student.id)
        .single();
      if (cur && (!cur.plan_end || cur.plan_end > todayLocalISO())) {
        await supabase
          .from("students")
          .update({ plan_end: todayLocalISO() })
          .eq("id", student.id);
      }

      // 5) Marca o aluno como inativo
      const { error: err } = await supabase
        .from("students")
        .update({ status: "inativo" })
        .eq("id", student.id);
      if (err) throw err;

      setInactivateOpen(false);
      setTyped("");
      setStatus("inativo");
      setInactivating(false);
      router.refresh();
    } catch {
      setError("Não foi possível inativar o aluno. Tente novamente.");
      setInactivating(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const path = `students/${student.id}/${Date.now()}-${file.name}`;
    const { error: upError } = await supabase.storage
      .from("student-photos")
      .upload(path, file);

    if (!upError) {
      const url = supabase.storage
        .from("student-photos")
        .getPublicUrl(path).data.publicUrl;
      const { error } = await supabase
        .from("students")
        .update({ photo_url: url })
        .eq("id", student.id);
      if (!error) setPhotoUrl(url);
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com foto do aluno */}
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Foto de ${student.name}`}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-200 text-3xl font-bold text-neutral-500">
              {student.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto"
            className="absolute -bottom-1 -right-1 rounded-full bg-red-600 p-1.5 text-white shadow transition hover:bg-red-700 disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">{capitalizeName(student.name)}</h1>
          <p className="text-sm text-neutral-500">{student.whatsapp ?? "Sem WhatsApp"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "ativo"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status}
          </span>
          {status === "ativo" ? (
            <button
              onClick={() => {
                setError(null);
                setTyped("");
                setInactivateOpen(true);
              }}
              disabled={toggling}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition duration-200 hover:bg-red-100 disabled:opacity-50"
            >
              Inativar aluno
            </button>
          ) : (
            <button
              onClick={reactivateStudent}
              disabled={toggling}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {toggling ? "Salvando..." : "Reativar aluno"}
            </button>
          )}

          {/* Botão Relatório PDF — abre o PDF em nova aba para baixar/enviar */}
          <a
            href={`/api/report/${student.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Gerar relatório de evolução em PDF"
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-neutral-800 active:scale-[0.98]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Relatório PDF
          </a>

          <DeleteStudentButton studentId={student.id} studentName={student.name} />
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "border-red-600 text-red-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Aba Dados */}
      {tab === "dados" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Foto do aluno</h2>
            <div className="mt-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Foto de ${student.name}`}
                  className="h-48 w-48 rounded-xl object-cover"
                />
              ) : (
                <p className="text-neutral-500">Nenhuma foto cadastrada. Clique no botão de câmera no topo para adicionar.</p>
              )}
            </div>
          </section>

          <Section title="Dados pessoais">
            <Field label="Nome completo" value={capitalizeName(student.name)} />
            <Field label="Data de nascimento" value={formatDateBR(student.birth_date)} />
            <Field label="Idade" value={student.birth_date ? String(calcAge(student.birth_date)) : null} />
            <Field label="WhatsApp" value={student.whatsapp} />
            <Field label="E-mail" value={student.email} />
            <Field label="Gênero" value={student.gender} />
            <Field label="Bairro" value={student.neighborhood} />
            <Field label="Endereço completo" value={student.address} />
          </Section>

          <Section title="Saúde e treino">
            <Field label="Objetivo principal" value={student.goal} />
            <Field label="Restrições ou lesões" value={student.restrictions} />
            <Field label="Condicionamento atual" value={student.fitness_level} />
            <Field label="Experiência com treino" value={student.training_experience} />
            <Field label="Frequência desejada" value={student.weekly_frequency ? `${student.weekly_frequency}x/semana` : null} />
          </Section>

          <Section title="Plano e financeiro">
            <Field label="Plano" value={student.plan_name} />
            <Field label="Valor mensal" value={student.plan_price != null ? `R$ ${student.plan_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
            <Field label="Início do plano" value={formatDateBR(student.plan_start)} />
            <Field label="Vencimento" value={formatDateBR(student.plan_end)} />
            <Field label="Status" value={status} />
          </Section>

          <Section title="Notas">
            <Field label="Observações" value={student.notes} />
          </Section>
        </div>
      )}

      {tab === "evolucao" && (
        <EvolutionTab studentId={student.id} initialRecords={evolution} />
      )}

      {tab === "pagamentos" && <PaymentsTab studentId={student.id} />}

      {tab === "agenda" && <AgendaTab studentId={student.id} />}

      {tab === "notas" && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Módulo em desenvolvimento — disponível nas próximas fases.
        </div>
      )}

      {/* Modal de confirmação — Inativar */}
      {inactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">Inativar aluno</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Você está prestes a inativar <strong>{capitalizeName(student.name)}</strong>. Esta ação:
            </p>
            <ul className="mt-3 list-inside space-y-1 text-sm text-neutral-600">
              <li>• Cancela as aulas agendadas (elas saem da agenda);</li>
              <li>• Cancela os pagamentos pendentes;</li>
              <li>• Encerra a vigência do plano na data de hoje;</li>
              <li>• Deve ser usada apenas quando tudo estiver acertado entre aluno e personal.</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-600">
              O histórico (pagamentos, evolução, fotos) é preservado. O aluno poderá ser reativado depois.
            </p>

            <label htmlFor="confirm-inactivate" className="mt-4 block text-sm font-semibold text-neutral-800">
              Digite <span className="font-mono text-red-600">INATIVAR</span> para confirmar
            </label>
            <input
              id="confirm-inactivate"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder="INATIVAR"
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-red-600 focus:outline-none"
            />

            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setInactivateOpen(false)}
                disabled={inactivating}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={inactivateStudent}
                disabled={!canInactivate || inactivating}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {inactivating ? "Inativando..." : "Inativar aluno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}