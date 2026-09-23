"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeName, formatDateBR } from "@/lib/format";
import { whatsAppLink } from "@/lib/whatsapp";
import EvolutionTab, { type EvolutionRecord } from "./EvolutionTab";
import PaymentsTab from "./PaymentsTab";
import AgendaTab from "./AgendaTab";
import NotesTab from "./NotesTab";
import EditStudentModal from "./EditStudentModal";
import StudentHeader from "./StudentHeader";
import InactivateStudentModal from "./InactivateStudentModal";
import SendEmailModal from "./SendEmailModal";
import { Card } from "@/components/ui/Card";
import type { Student } from "@/types";
import { inactivateStudentAction, reactivateStudentAction } from "@/server/actions/students";

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

export default function StudentProfile({
  student,
  evolution,
}: {
  student: Student;
  evolution: EvolutionRecord[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("dados");
  const [status, setStatus] = useState(student.status);
  const [photoUrl, setPhotoUrl] = useState(student.photo_url);
  const [toggling, setToggling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Modal de confirmação de inativação
  const [inactivateOpen, setInactivateOpen] = useState(false);
  const [inactivating, setInactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modal de envio por e-mail
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Link do WhatsApp com mensagem pré-preenchida (null se número inválido)
  const whatsLink = whatsAppLink(
    student.whatsapp,
    `Olá, ${student.name.split(" ")[0]}! Tudo bem?`
  );

  async function handleReactivate() {
    setToggling(true);
    const res = await reactivateStudentAction(student.id);
    if (res.ok) {
      setStatus("ativo");
      router.refresh();
    }
    setToggling(false);
  }

  async function handleInactivate() {
    if (inactivating) return;
    setInactivating(true);
    setError(null);
    const res = await inactivateStudentAction(student.id);
    if (res.ok) {
      setInactivateOpen(false);
      setStatus("inativo");
      router.refresh();
    } else {
      setError(res.error ?? "Não foi possível inativar o aluno. Tente novamente.");
    }
    setInactivating(false);
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

  async function handleSendEmail(email: string) {
    if (!email.trim() || sending) return;
    setSending(true);
    setEmailMsg(null);
    try {
      const res = await fetch(`/api/report/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailMsg({ ok: true, text: "Relatório enviado por e-mail com sucesso." });
      } else {
        setEmailMsg({ ok: false, text: data.error ?? "Não foi possível enviar o e-mail." });
      }
    } catch {
      setEmailMsg({ ok: false, text: "Erro de conexão ao enviar o e-mail." });
    }
    setSending(false);
  }

  function openEmailModal() {
    setEmailMsg(null);
    setEmailModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <StudentHeader
        student={student}
        status={status}
        photoUrl={photoUrl}
        uploading={uploading}
        toggling={toggling}
        whatsLink={whatsLink}
        onEdit={() => setEditOpen(true)}
        onInactivate={() => {
          setError(null);
          setInactivateOpen(true);
        }}
        onReactivate={handleReactivate}
        onExportEmail={openEmailModal}
        onPhotoChange={handlePhoto}
      />

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
          <Card title="Foto do aluno">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Foto de ${student.name}`}
                className="h-48 w-48 rounded-xl object-cover"
              />
            ) : (
              <p className="text-neutral-500">Nenhuma foto cadastrada. Clique no botão de câmera no topo para adicionar.</p>
            )}
          </Card>
          <Card title="Dados pessoais">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome completo" value={capitalizeName(student.name)} />
              <Field label="Data de nascimento" value={formatDateBR(student.birth_date)} />
              <Field label="Idade" value={student.birth_date ? String(calcAge(student.birth_date)) : null} />
              <Field label="WhatsApp" value={student.whatsapp} />
              <Field label="E-mail" value={student.email} />
              <Field label="Gênero" value={student.gender} />
              <Field label="Bairro" value={student.neighborhood} />
              <Field label="Endereço completo" value={student.address} />
            </div>
          </Card>
          <Card title="Saúde e treino">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Objetivo principal" value={student.goal} />
              <Field label="Restrições ou lesões" value={student.restrictions} />
              <Field label="Condicionamento atual" value={student.fitness_level} />
              <Field label="Experiência com treino" value={student.training_experience} />
              <Field label="Frequência desejada" value={student.weekly_frequency ? `${student.weekly_frequency}x/semana` : null} />
            </div>
          </Card>
          <Card title="Plano e financeiro">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Plano" value={student.plan_name} />
              <Field label="Valor mensal" value={student.plan_price != null ? `R$ ${student.plan_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              <Field label="Início do plano" value={formatDateBR(student.plan_start)} />
              <Field label="Vencimento" value={formatDateBR(student.plan_end)} />
              <Field label="Status" value={status} />
            </div>
          </Card>
          <Card title="Notas">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Observações" value={student.notes} />
            </div>
          </Card>
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

      {/* Modal de confirmação — Inativar */}
      <InactivateStudentModal
        open={inactivateOpen}
        onClose={() => setInactivateOpen(false)}
        studentName={capitalizeName(student.name)}
        inactivating={inactivating}
        error={error}
        onConfirm={handleInactivate}
      />

      {/* Modal — Enviar por e-mail */}
      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        studentName={capitalizeName(student.name)}
        initialEmail={student.email ?? ""}
        sending={sending}
        message={emailMsg}
        onSend={handleSendEmail}
      />

      {/* Modal — Editar perfil */}
      {editOpen && (
        <EditStudentModal student={student} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}