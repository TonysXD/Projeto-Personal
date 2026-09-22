"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";
import DateInput from "@/components/DateInput";

type Photo = { id: string; url: string };

export type EvolutionRecord = {
  id: string;
  record_date: string;
  weight: number | null;
  height: number | null;
  body_fat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
  created_at: string;
  evolution_photos: Photo[];
};

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

function calcBMI(weight: number, heightCm: number) {
  if (!weight || !heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  return weight / (h * h);
}

function bmiInfo(bmi: number) {
  if (bmi < 18.5) return { label: "Abaixo do peso", badge: "bg-blue-100 text-blue-800" };
  if (bmi < 25) return { label: "Peso normal", badge: "bg-green-100 text-green-800" };
  if (bmi < 30) return { label: "Sobrepeso", badge: "bg-amber-100 text-amber-800" };
  return { label: "Obesidade", badge: "bg-red-100 text-red-800" };
}

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const measureLabels: Record<string, string> = {
  cintura: "Cintura (cm)",
  braco: "Braço (cm)",
  quadril: "Quadril (cm)",
  coxa: "Coxa (cm)",
};

export default function EvolutionTab({
  studentId,
  initialRecords,
}: {
  studentId: string;
  initialRecords: EvolutionRecord[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const last = initialRecords[0];

  const [date, setDate] = useState(todayLocalISO());
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(last?.height ? String(last.height) : "");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [arm, setArm] = useState("");
  const [hip, setHip] = useState("");
  const [thigh, setThigh] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const w = parseFloat(weight.replace(",", "."));
  const h = parseFloat(height.replace(",", "."));
  const bmi = calcBMI(w, h);
  const bmiResult = bmi ? bmiInfo(bmi) : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!w || !h) {
      setError("Peso e altura são obrigatórios.");
      return;
    }

    setLoading(true);

    const measurements: Record<string, number> = {};
    if (parseFloat(waist)) measurements.cintura = parseFloat(waist);
    if (parseFloat(arm)) measurements.braco = parseFloat(arm);
    if (parseFloat(hip)) measurements.quadril = parseFloat(hip);
    if (parseFloat(thigh)) measurements.coxa = parseFloat(thigh);

    const { data: record, error: recError } = await supabase
      .from("evolution")
      .insert({
        student_id: studentId,
        record_date: date,
        weight: w,
        height: h,
        body_fat: parseFloat(bodyFat) || null,
        measurements: Object.keys(measurements).length ? measurements : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (recError || !record) {
      setError("Não foi possível salvar o registro. Tente novamente.");
      setLoading(false);
      return;
    }

    for (const file of photos) {
      const path = `${studentId}/${record.id}/${Date.now()}-${file.name}`;
      const { error: upError } = await supabase.storage
        .from("evolution-photos")
        .upload(path, file);
      if (!upError) {
        const { data: pub } = supabase.storage
          .from("evolution-photos")
          .getPublicUrl(path);
        await supabase
          .from("evolution_photos")
          .insert({ evolution_id: record.id, url: pub.publicUrl });
      }
    }

    setDate(todayLocalISO());
    setWeight("");
    setBodyFat("");
    setWaist("");
    setArm("");
    setHip("");
    setThigh("");
    setNotes("");
    setPhotos([]);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(recordId: string) {
    if (!confirm("Excluir este registro de evolução?")) return;
    setDeleting(recordId);

    const { data: photosData } = await supabase
      .from("evolution_photos")
      .select("url")
      .eq("evolution_id", recordId);

    for (const p of photosData ?? []) {
      const path = decodeURIComponent(
        p.url.split("/object/public/evolution-photos/")[1] ?? ""
      );
      if (path) await supabase.storage.from("evolution-photos").remove([path]);
    }

    await supabase.from("evolution_photos").delete().eq("evolution_id", recordId);
    await supabase.from("evolution").delete().eq("id", recordId);
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Resumo da evolução */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Peso atual</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {last?.weight != null ? `${last.weight} kg` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">IMC atual</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {last && last.weight != null && last.height
              ? calcBMI(last.weight, last.height)?.toFixed(1)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Registros</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{initialRecords.length}</p>
        </div>
      </div>

      {/* Formulário de novo registro */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Novo registro de evolução</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-date" className={labelClasses}>Data *</label>
            <DateInput id="ev-date" className={inputClasses} value={date} onChange={setDate} required />
          </div>
          <div>
            <label htmlFor="ev-weight" className={labelClasses}>Peso (kg) *</label>
            <input id="ev-weight" type="number" step="0.1" min="0" className={inputClasses} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex.: 82,5" required />
          </div>
          <div>
            <label htmlFor="ev-height" className={labelClasses}>Altura (cm) *</label>
            <input id="ev-height" type="number" step="0.1" min="0" className={inputClasses} value={height} onChange={(e) => setHeight(e.target.value)} placeholder="ex.: 175" required />
          </div>
          <div>
            <label htmlFor="ev-fat" className={labelClasses}>% de gordura</label>
            <input id="ev-fat" type="number" step="0.1" min="0" className={inputClasses} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="opcional" />
          </div>
        </div>

        {/* IMC calculado ao vivo */}
        <div className={`mt-4 rounded-lg p-4 ${bmiResult ? bmiResult.badge : "bg-neutral-50"}`}>
          {bmi ? (
            <p className="text-sm font-semibold">
              IMC: <span className="text-lg font-bold">{bmi.toFixed(1)}</span> — {bmiResult?.label}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Preencha peso e altura para calcular o IMC automaticamente.</p>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="ev-waist" className={labelClasses}>Cintura (cm)</label>
            <input id="ev-waist" type="number" step="0.1" min="0" className={inputClasses} value={waist} onChange={(e) => setWaist(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-arm" className={labelClasses}>Braço (cm)</label>
            <input id="ev-arm" type="number" step="0.1" min="0" className={inputClasses} value={arm} onChange={(e) => setArm(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-hip" className={labelClasses}>Quadril (cm)</label>
            <input id="ev-hip" type="number" step="0.1" min="0" className={inputClasses} value={hip} onChange={(e) => setHip(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-thigh" className={labelClasses}>Coxa (cm)</label>
            <input id="ev-thigh" type="number" step="0.1" min="0" className={inputClasses} value={thigh} onChange={(e) => setThigh(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="ev-notes" className={labelClasses}>Observações</label>
          <textarea id="ev-notes" rows={2} className={inputClasses} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex.: treino de perna pesado, dormiu bem" />
        </div>

        <div className="mt-4">
          <label htmlFor="ev-photos" className={labelClasses}>Fotos de evolução (pode escolher várias)</label>
          <input
            id="ev-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-700"
          />
          {photos.length > 0 && (
            <p className="mt-2 text-sm text-neutral-500">{photos.length} foto(s) selecionada(s): {photos.map((f) => f.name).join(", ")}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar registro"}
        </button>
      </form>

      {/* Histórico */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Histórico de evolução</h2>

        {initialRecords.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            Nenhum registro ainda. Preencha o formulário acima para começar a acompanhar a evolução.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {initialRecords.map((r) => {
              const rBmi = r.weight != null && r.height ? calcBMI(r.weight, r.height) : null;
              const rInfo = rBmi ? bmiInfo(rBmi) : null;
              return (
                <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-bold text-neutral-900">{formatDateBR(r.record_date)}</h3>
                      {rInfo && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rInfo.badge}`}>
                          IMC {rBmi?.toFixed(1)} · {rInfo.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === r.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Peso</p>
                      <p className="text-neutral-800">{r.weight != null ? `${r.weight} kg` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Altura</p>
                      <p className="text-neutral-800">{r.height ? `${r.height} cm` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">% gordura</p>
                      <p className="text-neutral-800">{r.body_fat != null ? `${r.body_fat}%` : "—"}</p>
                    </div>
                  </div>

                  {r.measurements && Object.keys(r.measurements).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(r.measurements).map(([key, value]) => (
                        <span key={key} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                          {measureLabels[key] ?? key}: {value} cm
                        </span>
                      ))}
                    </div>
                  )}

                  {r.notes && (
                    <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{r.notes}</p>
                  )}

                  {r.evolution_photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {r.evolution_photos.map((p) => (
                        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt={`Foto de evolução de ${formatDateBR(r.record_date)}`}
                            className="aspect-square w-full rounded-lg object-cover transition hover:opacity-80"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}