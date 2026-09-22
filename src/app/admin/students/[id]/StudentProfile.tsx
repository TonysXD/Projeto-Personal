"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeName, formatDateBR } from "@/lib/format";
import { whatsAppLink } from "@/lib/whatsapp";
import EvolutionTab, { type EvolutionRecord } from "./EvolutionTab";
import PaymentsTab from "./PaymentsTab";
import AgendaTab from "./AgendaTab";
import NotesTab from "./NotesTab";
import EditStudentModal from "./EditStudentModal";
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
  const [editOpen, setEditOpen] = useState(false);

  // Modal de confirmação de inativação
  const [inactivateOpen, setInactivateOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [inactivating, setInactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canInactivate = typed.trim().toUpperCase() === "INATIVAR";

  // Link do WhatsApp com mensagem pré-preenchida (null se número inválido)
  const whatsLink = whatsAppLink(
    student.whatsapp,
    `Olá, ${student.name.split(" ")[0]}! Tudo bem?`
  );

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

          {/* Botão Editar — abre o modal de edição do perfil */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition duration-200 hover:bg-neutral-50 active:scale-[0.98]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>

          {/* Botão WhatsApp — abre conversa direta com o aluno */}
          {whatsLink && (
            <a
              href={whatsLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir conversa no WhatsApp"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-green-700 active:scale-[0.98]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          )}

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
        <NotesTab studentId={student.id} initialNotes={student.notes} />
      )}

      {/* Modal de edição do perfil */}
      {editOpen && (
        <EditStudentModal student={student} onClose={() => setEditOpen(false)} />
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