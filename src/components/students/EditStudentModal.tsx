"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DateInput from "@/components/DateInput";

/* ============================================================
   Modal de edição do perfil do aluno — todas as informações
   editáveis do formulário de cadastro.
   ============================================================ */

type EditableStudent = {
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
  notes: string | null;
};

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600 focus:outline-none";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelClasses}>
      {children}
      {required ? (
        <span className="ml-1 text-red-600">*</span>
      ) : (
        <span className="ml-1 text-xs font-normal text-neutral-400">(opcional)</span>
      )}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-neutral-100 pb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
      {children}
    </h3>
  );
}

export default function EditStudentModal({
  student,
  onClose,
}: {
  student: EditableStudent;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: student.name,
    whatsapp: student.whatsapp ?? "",
    email: student.email ?? "",
    birth_date: student.birth_date ?? "",
    gender: student.gender ?? "",
    neighborhood: student.neighborhood ?? "",
    address: student.address ?? "",
    goal: student.goal ?? "",
    restrictions: student.restrictions ?? "",
    fitness_level: student.fitness_level ?? "",
    training_experience: student.training_experience ?? "",
    weekly_frequency: student.weekly_frequency != null ? String(student.weekly_frequency) : "",
    plan_name: student.plan_name ?? "",
    plan_price: student.plan_price != null ? String(student.plan_price) : "",
    plan_start: student.plan_start ?? "",
    plan_end: student.plan_end ?? "",
    notes: student.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    if (!form.whatsapp.trim()) {
      setError("O número de WhatsApp é obrigatório.");
      return;
    }

    setSaving(true);

    const { error: err } = await supabase
      .from("students")
      .update({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        neighborhood: form.neighborhood.trim() || null,
        address: form.address.trim() || null,
        goal: form.goal.trim() || null,
        restrictions: form.restrictions.trim() || null,
        fitness_level: form.fitness_level || null,
        training_experience: form.training_experience.trim() || null,
        weekly_frequency: form.weekly_frequency
          ? parseInt(form.weekly_frequency, 10)
          : null,
        plan_name: form.plan_name.trim() || null,
        plan_price: form.plan_price
          ? parseFloat(form.plan_price.replace(",", "."))
          : null,
        plan_start: form.plan_start || null,
        plan_end: form.plan_end || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    if (err) {
      setError("Não foi possível salvar as alterações. Tente novamente.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Editar aluno</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* ===== Dados pessoais ===== */}
          <div>
            <SectionTitle>Dados pessoais</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Nome completo</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nome do aluno"
                  required
                />
              </div>
              <div>
                <FieldLabel required>WhatsApp</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div>
                <FieldLabel>E-mail</FieldLabel>
                <input
                  type="email"
                  className={inputClasses}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <FieldLabel>Data de nascimento</FieldLabel>
                <DateInput
                  className={inputClasses}
                  value={form.birth_date}
                  onChange={(v) => set("birth_date", v)}
                />
              </div>
              <div>
                <FieldLabel>Gênero</FieldLabel>
                <select
                  className={inputClasses}
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não informar">Prefiro não informar</option>
                </select>
              </div>
            </div>
          </div>

          {/* ===== Endereço ===== */}
          <div>
            <SectionTitle>Endereço</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Bairro</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.neighborhood}
                  onChange={(e) => set("neighborhood", e.target.value)}
                  placeholder="Bairro"
                />
              </div>
              <div>
                <FieldLabel>Endereço completo</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>
            </div>
          </div>

          {/* ===== Saúde e treino ===== */}
          <div>
            <SectionTitle>Saúde e treino</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Objetivo principal</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.goal}
                  onChange={(e) => set("goal", e.target.value)}
                  placeholder="ex.: hipertrofia, emagrecimento, condicionamento"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Restrições ou lesões</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.restrictions}
                  onChange={(e) => set("restrictions", e.target.value)}
                  placeholder="ex.: joelho sensível, hipertensão"
                />
              </div>
              <div>
                <FieldLabel>Condicionamento atual</FieldLabel>
                <select
                  className={inputClasses}
                  value={form.fitness_level}
                  onChange={(e) => set("fitness_level", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>
              <div>
                <FieldLabel>Frequência desejada (x/semana)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={7}
                  className={inputClasses}
                  value={form.weekly_frequency}
                  onChange={(e) => set("weekly_frequency", e.target.value)}
                  placeholder="ex.: 3"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Experiência com treino</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.training_experience}
                  onChange={(e) => set("training_experience", e.target.value)}
                  placeholder="ex.: treina há 2 anos"
                />
              </div>
            </div>
          </div>

          {/* ===== Plano e financeiro ===== */}
          <div>
            <SectionTitle>Plano e financeiro</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Plano</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.plan_name}
                  onChange={(e) => set("plan_name", e.target.value)}
                  placeholder="ex.: Mensal, Trimestral"
                />
              </div>
              <div>
                <FieldLabel>Valor mensal (R$)</FieldLabel>
                <input
                  className={inputClasses}
                  value={form.plan_price}
                  onChange={(e) => set("plan_price", e.target.value)}
                  placeholder="ex.: 350"
                />
              </div>
              <div>
                <FieldLabel>Início do plano</FieldLabel>
                <DateInput
                  className={inputClasses}
                  value={form.plan_start}
                  onChange={(v) => set("plan_start", v)}
                />
              </div>
              <div>
                <FieldLabel>Vencimento</FieldLabel>
                <DateInput
                  className={inputClasses}
                  value={form.plan_end}
                  onChange={(v) => set("plan_end", v)}
                />
              </div>
            </div>
          </div>

          {/* ===== Notas ===== */}
          <div>
            <SectionTitle>Notas</SectionTitle>
            <FieldLabel>Observações</FieldLabel>
            <textarea
              rows={3}
              className={inputClasses}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anotações sobre o aluno"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}