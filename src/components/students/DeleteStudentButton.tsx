"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteStudentButton({
  studentId,
  studentName,
  redirectTo = "/admin/students",
}: {
  studentId: string;
  studentName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = typed.trim() === "APAGAR";

  function openConfirm() {
    setMenuOpen(false);
    setTyped("");
    setError(null);
    setConfirmOpen(true);
  }

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);

    try {
      // 1) IDs das evoluções do aluno
      const { data: evolutions } = await supabase
        .from("evolution")
        .select("id")
        .eq("student_id", studentId);

      const evolutionIds = (evolutions ?? []).map((e) => e.id);

      // 2) Fotos para apagar do storage
      let photoPaths: string[] = [];
      if (evolutionIds.length > 0) {
        const { data: photos } = await supabase
          .from("evolution_photos")
          .select("url")
          .in("evolution_id", evolutionIds);
        photoPaths = (photos ?? [])
          .map((p) => p.url.split("/object/public/evolution-photos/")[1])
          .filter(Boolean);
      }

      // 3) Apaga as fotos do storage
      if (photoPaths.length > 0) {
        await supabase.storage.from("evolution-photos").remove(photoPaths);
      }

      // 4) Apaga o aluno (o banco apaga em cascata: pagamentos, agenda, evolução, notas, fotos)
      const { error: delError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (delError) throw delError;

      setConfirmOpen(false);
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Não foi possível excluir o aluno. Tente novamente.");
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Botão de 3 pontinhos */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Opções de ${studentName}`}
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={openConfirm}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
                Deletar aluno
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">Excluir aluno</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Você está prestes a excluir <strong>{studentName}</strong>. Esta ação é
              <strong> permanente</strong> e apagará todos os dados do aluno: pagamentos,
              agendamentos, evolução, fotos e notas. Essa operação não pode ser desfeita.
            </p>

            <label htmlFor="confirm-delete" className="mt-4 block text-sm font-semibold text-neutral-800">
              Digite <span className="font-mono text-red-600">APAGAR</span> para confirmar
            </label>
            <input
              id="confirm-delete"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="APAGAR"
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
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? "Excluindo..." : "Excluir aluno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}