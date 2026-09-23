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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { Student } from "@/types";

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
  // Menu Exportar PDF
  const [exportOpen, setExportOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(student.email ?? "");
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
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

  async function handleSendEmail() {
    if (!emailTo.trim() || sending) return;
    setSending(true);
    setEmailMsg(null);
    try {
      const res = await fetch(`/api/report/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo.trim() }),
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho do aluno */}
      <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center">
        {/* Foto + nome + status */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Foto de ${student.name}`}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-neutral-100"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold text-neutral-400">
                {student.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Alterar foto"
              className="absolute -bottom-0.5 -right-0.5 rounded-full bg-red-600 p-1.5 text-white shadow-md ring-2 ring-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
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
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-neutral-900 sm:text-2xl">
              {capitalizeName(student.name)}
            </h1>
            <p className="mt-0.5 truncate text-sm text-neutral-500">
              {student.whatsapp ?? "Sem WhatsApp"}
            </p>
            <div className="mt-2">
              <Badge variant={status === "ativo" ? "success" : "danger"} dot>
                {status === "ativo" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Barra de ações — agrupadas por função */}
        <div className="flex flex-wrap items-center gap-2.5 lg:ml-auto">
          {/* Grupo 1 — Contato e documentos (ações de produção) */}
          {whatsLink && (
            <a
              href={whatsLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir conversa no WhatsApp"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 active:scale-[0.98]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          )}

          {/* Botão Exportar PDF com menu */}
          <div className="relative">
            <Button variant="primary" onClick={() => setExportOpen((v) => !v)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exportar PDF
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-70">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
                  <a
                    href={`/api/report/${student.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setExportOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-neutral-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Baixar PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailTo(student.email ?? "");
                      setEmailMsg(null);
                      setExportOpen(false);
                      setEmailModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-neutral-400">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 5L2 7" />
                    </svg>
                    Enviar por e-mail
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Separador entre produção e manutenção */}
          <div className="hidden h-6 w-px bg-neutral-200 sm:block" aria-hidden="true" />

          {/* Grupo 2 — Manutenção */}
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </Button>

          {/* Separador entre manutenção e ações de risco */}
          <div className="hidden h-6 w-px bg-neutral-200 sm:block" aria-hidden="true" />

          {/* Grupo 3 — Estado e exclusão (ações de risco) */}
          {status === "ativo" ? (
            <Button
              variant="dangerOutline"
              onClick={() => {
                setError(null);
                setTyped("");
                setInactivateOpen(true);
              }}
              disabled={toggling}
            >
              Inativar aluno
            </Button>
          ) : (
            <Button variant="success" onClick={reactivateStudent} disabled={toggling}>
              {toggling ? "Salvando..." : "Reativar aluno"}
            </Button>
          )}

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
      <Modal
        open={inactivateOpen}
        onClose={() => setInactivateOpen(false)}
        title="Inativar aluno"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setInactivateOpen(false)}
              disabled={inactivating}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={inactivateStudent}
              disabled={!canInactivate || inactivating}
            >
              {inactivating ? "Inativando..." : "Inativar aluno"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
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
        <div className="mt-4">
          <Input
            id="confirm-inactivate"
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder="INATIVAR"
            autoComplete="off"
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </Modal>

      {/* Modal — Enviar por e-mail */}
      <Modal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Enviar relatório por e-mail"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEmailModalOpen(false)}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleSendEmail}
              disabled={!emailTo.trim() || sending}
            >
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          O PDF de evolução de <strong>{capitalizeName(student.name)}</strong> será enviado em anexo.
        </p>
        <div className="mt-4">
          <Input
            id="report-email"
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>
        {emailMsg && (
          <p
            className={`mt-3 rounded-lg p-3 text-center text-sm font-medium ${
              emailMsg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {emailMsg.text}
          </p>
        )}
      </Modal>

      {/* Modal — Editar perfil */}
      {editOpen && (
        <EditStudentModal student={student} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}