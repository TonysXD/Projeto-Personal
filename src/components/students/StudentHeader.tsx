"use client";
import { useRef, useState } from "react";
import { capitalizeName } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import DeleteStudentButton from "./DeleteStudentButton";
import type { Student } from "@/types";

type StudentHeaderProps = {
  student: Student;
  status: string;
  photoUrl: string | null;
  uploading: boolean;
  toggling: boolean;
  whatsLink: string | null;
  onEdit: () => void;
  onInactivate: () => void;
  onReactivate: () => void;
  onExportEmail: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function StudentHeader({
  student,
  status,
  photoUrl,
  uploading,
  toggling,
  whatsLink,
  onEdit,
  onInactivate,
  onReactivate,
  onExportEmail,
  onPhotoChange,
}: StudentHeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  return (
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
            onChange={onPhotoChange}
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
                    setExportOpen(false);
                    onExportEmail();
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
        <Button variant="secondary" onClick={onEdit}>
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
          <Button variant="dangerOutline" onClick={onInactivate} disabled={toggling}>
            Inativar aluno
          </Button>
        ) : (
          <Button variant="success" onClick={onReactivate} disabled={toggling}>
            {toggling ? "Salvando..." : "Reativar aluno"}
          </Button>
        )}

        <DeleteStudentButton studentId={student.id} studentName={student.name} />
      </div>
    </div>
  );
}