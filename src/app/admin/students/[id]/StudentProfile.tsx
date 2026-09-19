"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EvolutionTab, { type EvolutionRecord } from "./EvolutionTab";
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

  async function toggleStatus() {
    const next = status === "ativo" ? "inativo" : "ativo";

    if (next === "inativo") {
      const ok = confirm(
        "Inativar este aluno? O histórico completo (pagamentos, evolução, fotos) será mantido."
      );
      if (!ok) return;
    }

    setToggling(true);
    const { error } = await supabase
      .from("students")
      .update({ status: next })
      .eq("id", student.id);

    if (!error) {
      setStatus(next);
      router.refresh();
    }
    setToggling(false);
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
          <h1 className="text-2xl font-bold text-neutral-900">{student.name}</h1>
          <p className="text-sm text-neutral-500">{student.whatsapp ?? "Sem WhatsApp"}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "ativo"
                ? "bg-green-100 text-green-800"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {status}
          </span>
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 disabled:opacity-50 ${
              status === "ativo"
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {toggling
              ? "Salvando..."
              : status === "ativo"
              ? "Inativar aluno"
              : "Reativar aluno"}
          </button>
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

      {/* Aba Dados: foto grande + informações em sequência, como no formulário */}
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
            <Field label="Nome completo" value={student.name} />
            <Field label="Data de nascimento" value={student.birth_date} />
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
            <Field label="Início do plano" value={student.plan_start} />
            <Field label="Vencimento" value={student.plan_end} />
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

      {(tab === "pagamentos" || tab === "agenda" || tab === "notas") && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Módulo em desenvolvimento — disponível nas próximas fases.
        </div>
      )}
    </div>
  );
}