"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ============================================================
   Aba Notas — observações do aluno (coluna notes em students)
   Edição direta com salvamento, remoção, feedback e contador.
   ============================================================ */

const MAX_NOTES = 2000;

export default function NotesTab({
  studentId,
  initialNotes,
}: {
  studentId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = notes.trim();
  const dirty = trimmed !== (initialNotes ?? "").trim();
  const hasSavedNote = !!initialNotes?.trim();

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    setRemoved(false);

    const { error: err } = await supabase
      .from("students")
      .update({ notes: trimmed || null })
      .eq("id", studentId);

    if (err) {
      setError("Não foi possível salvar as notas. Tente novamente.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleRemove() {
    if (removing) return;
    if (!confirm("Remover a nota deste aluno? A observação salva no perfil será apagada.")) {
      return;
    }

    setRemoving(true);
    setError(null);
    setSaved(false);
    setRemoved(false);

    const { error: err } = await supabase
      .from("students")
      .update({ notes: null })
      .eq("id", studentId);

    if (err) {
      setError("Não foi possível remover a nota. Tente novamente.");
      setRemoving(false);
      return;
    }

    setNotes("");
    setRemoving(false);
    setRemoved(true);
    router.refresh();
  }

  function handleClear() {
    if (notes.trim() && !confirm("Limpar o texto do campo? Você ainda pode salvar depois.")) {
      return;
    }
    setNotes("");
    setSaved(false);
    setRemoved(false);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da aba */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Notas e observações</h2>
          <p className="text-sm text-neutral-500">
            Anotações livres sobre o aluno — objetivos, preferências, lembretes, histórico de conversas.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
          {notes.length}/{MAX_NOTES}
        </span>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <label htmlFor="notes-textarea" className="mb-1.5 block text-sm font-semibold text-neutral-800">
          Observações
        </label>
        <textarea
          id="notes-textarea"
          rows={10}
          maxLength={MAX_NOTES}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
            setRemoved(false);
          }}
          placeholder="Ex.: aluno prefere treino pela manhã, tem joelho sensível, objetivo é hipertrofia..."
          className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600 focus:outline-none"
        />

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        {saved && !dirty && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-800">
            ✓ Notas salvas com sucesso.
          </p>
        )}

        {removed && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-800">
            ✓ Nota removida. A observação foi apagada do perfil.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!notes.trim() || saving || removing}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar campo
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={!hasSavedNote || saving || removing}
              title={hasSavedNote ? "Apaga a observação salva no perfil" : "Nenhuma nota salva para remover"}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {removing ? "Removendo..." : "Remover nota"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || removing}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Salvando..." : dirty ? "Salvar notas" : "Salvo"}
          </button>
        </div>
      </div>

      {/* Dica de uso */}
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">💡 Sugestões do que anotar</h3>
        <ul className="mt-3 list-inside space-y-1.5 text-sm text-neutral-600">
          <li>• Preferências de horário e dias da semana</li>
          <li>• Restrições, lesões ou cuidados especiais</li>
          <li>• Objetivos de curto e longo prazo</li>
          <li>• Histórico de conversas e decisões importantes</li>
          <li>• Lembretes para a próxima sessão</li>
        </ul>
      </div>
    </div>
  );
}