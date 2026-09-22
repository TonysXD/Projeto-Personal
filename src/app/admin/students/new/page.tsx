"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeName } from "@/lib/format";
import DateInput from "@/components/DateInput";

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

const initialForm = {
  name: "", birth_date: "", whatsapp: "", email: "", gender: "",
  neighborhood: "", address: "", goal: "", restrictions: "",
  fitness_level: "", training_experience: "", weekly_frequency: "",
  plan_name: "", plan_price: "", plan_start: "", plan_end: "",
  notes: "",
};

export default function NewStudentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameBlur() {
    set("name", capitalizeName(form.name));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedName = capitalizeName(form.name);

    const required = [
      normalizedName, form.birth_date, form.whatsapp, form.goal,
      form.restrictions, form.plan_name, form.plan_price,
      form.plan_start, form.plan_end,
    ];
    if (required.some((v) => !v.trim())) {
      setError("Preencha todos os campos obrigatórios (marcados com *).");
      return;
    }

    setLoading(true);
    setError(null);

    let photoUrl: string | null = null;
    if (photo) {
      const path = `students/${Date.now()}-${photo.name}`;
      const { error: upError } = await supabase.storage
        .from("student-photos")
        .upload(path, photo);
      if (upError) {
        setError("Não foi possível enviar a foto. Tente novamente.");
        setLoading(false);
        return;
      }
      photoUrl = supabase.storage
        .from("student-photos")
        .getPublicUrl(path).data.publicUrl;
    }

    const { data, error: err } = await supabase
      .from("students")
      .insert({
        name: normalizedName,
        birth_date: form.birth_date,
        whatsapp: form.whatsapp,
        email: form.email || null,
        gender: form.gender || null,
        neighborhood: form.neighborhood || null,
        address: form.address || null,
        goal: form.goal,
        restrictions: form.restrictions,
        fitness_level: form.fitness_level || null,
        training_experience: form.training_experience || null,
        weekly_frequency: form.weekly_frequency
          ? parseInt(form.weekly_frequency)
          : null,
        plan_name: form.plan_name,
        plan_price: parseFloat(form.plan_price.replace(",", ".")),
        plan_start: form.plan_start,
        plan_end: form.plan_end,
        status: "ativo",
        notes: form.notes || null,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (err) {
      setError("Erro ao salvar. Verifique os campos e tente novamente.");
      setLoading(false);
      return;
    }

    router.push(`/admin/students/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Novo aluno</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Foto do aluno</h2>
          <div className="mt-3 flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Prévia da foto" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-200 text-2xl font-bold text-neutral-500">
                {form.name ? form.name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <label className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
              Escolher foto
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Remover
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Dados pessoais</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClasses}>Nome completo *</label>
              <input id="name" className={inputClasses} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={handleNameBlur} placeholder="Nome do aluno" />
            </div>
            <div>
              <label htmlFor="birth_date" className={labelClasses}>Data de nascimento *</label>
              <DateInput id="birth_date" className={inputClasses} value={form.birth_date} onChange={(v) => set("birth_date", v)} required />
            </div>
            <div>
              <label htmlFor="whatsapp" className={labelClasses}>WhatsApp *</label>
              <input id="whatsapp" className={inputClasses} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label htmlFor="email" className={labelClasses}>E-mail</label>
              <input id="email" type="email" className={inputClasses} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="opcional" />
            </div>
            <div>
              <label htmlFor="gender" className={labelClasses}>Gênero</label>
              <select id="gender" className={inputClasses} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Selecione...</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label htmlFor="neighborhood" className={labelClasses}>Bairro</label>
              <input id="neighborhood" className={inputClasses} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="ex.: Jardim Paulista" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className={labelClasses}>Endereço completo</label>
              <input id="address" className={inputClasses} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="opcional — necessário para atendimento a domicílio" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Saúde e treino</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="goal" className={labelClasses}>Objetivo principal *</label>
              <select id="goal" className={inputClasses} value={form.goal} onChange={(e) => set("goal", e.target.value)}>
                <option value="">Selecione...</option>
                <option value="emagrecer">Emagrecer</option>
                <option value="hipertrofia">Ganhar massa muscular</option>
                <option value="saude">Saúde e condicionamento</option>
              </select>
            </div>
            <div>
              <label htmlFor="restrictions" className={labelClasses}>Restrições ou lesões *</label>
              <input id="restrictions" className={inputClasses} value={form.restrictions} onChange={(e) => set("restrictions", e.target.value)} placeholder="ex.: joelho, coluna, hipertensão" />
            </div>
            <div>
              <label htmlFor="fitness_level" className={labelClasses}>Condicionamento atual</label>
              <select id="fitness_level" className={inputClasses} value={form.fitness_level} onChange={(e) => set("fitness_level", e.target.value)}>
                <option value="">Selecione...</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
            <div>
              <label htmlFor="training_experience" className={labelClasses}>Experiência com treino</label>
              <input id="training_experience" className={inputClasses} value={form.training_experience} onChange={(e) => set("training_experience", e.target.value)} placeholder="ex.: 2 anos de musculação" />
            </div>
            <div>
              <label htmlFor="weekly_frequency" className={labelClasses}>Frequência desejada (dias/semana)</label>
              <input id="weekly_frequency" type="number" min={1} max={7} className={inputClasses} value={form.weekly_frequency} onChange={(e) => set("weekly_frequency", e.target.value)} placeholder="ex.: 3" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Plano e financeiro</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="plan_name" className={labelClasses}>Plano *</label>
              <input id="plan_name" className={inputClasses} value={form.plan_name} onChange={(e) => set("plan_name", e.target.value)} placeholder="ex.: Mensal 3x" />
            </div>
            <div>
              <label htmlFor="plan_price" className={labelClasses}>Valor mensal (R$) *</label>
              <input id="plan_price" className={inputClasses} value={form.plan_price} onChange={(e) => set("plan_price", e.target.value)} placeholder="ex.: 350" />
            </div>
            <div>
              <label htmlFor="plan_start" className={labelClasses}>Início do plano *</label>
              <DateInput id="plan_start" className={inputClasses} value={form.plan_start} onChange={(v) => set("plan_start", v)} required />
            </div>
            <div>
              <label htmlFor="plan_end" className={labelClasses}>Vencimento *</label>
              <DateInput id="plan_end" className={inputClasses} value={form.plan_end} onChange={(v) => set("plan_end", v)} required />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Notas</h2>
          <div className="mt-3">
            <label htmlFor="notes" className={labelClasses}>Observações</label>
            <textarea id="notes" rows={3} className={inputClasses} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas internas do treinador" />
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar aluno"}
        </button>
      </form>
    </div>
  );
}