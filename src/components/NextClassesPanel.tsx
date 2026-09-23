"use client";
import { useEffect, useState } from "react";
import { capitalizeName, formatDateBR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type PanelStudent = {
  name: string;
  photo_url: string | null;
  goal: string | null;
  plan_name: string | null;
};

export type PanelItem = {
  key: string;
  kind: "fixa" | "avulsa";
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  student: PanelStudent | null;
};

const STATUS_BADGE: Record<string, { variant: "info" | "warning" | "danger" | "success"; label: string }> = {
  agendado: { variant: "info", label: "Agendado" },
  reagendado: { variant: "warning", label: "Reagendado" },
  cancelado: { variant: "danger", label: "Cancelado" },
  concluido: { variant: "success", label: "Concluído" },
};

function formatTimeBR(t?: string | null) {
  return t?.slice(0, 5) ?? "--:--";
}

function weekdayLabel(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
  });
}

export default function NextClassesPanel({ items }: { items: PanelItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length > 0 && index >= items.length) {
      setIndex(items.length - 1);
    }
  }, [items.length, index]);

  const current = items.length > 0 ? items[Math.min(index, items.length - 1)] : null;

  if (!current) {
    return (
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <EmptyState
          title="Nenhuma aula agendada"
          description="As próximas aulas (fixas e avulsas) aparecerão aqui."
        />
      </section>
    );
  }

  const status = STATUS_BADGE[current.status] ?? STATUS_BADGE.agendado;
  const initials = (current.student?.name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const prevDisabled = index <= 0;
  const nextDisabled = index >= items.length - 1;

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      {/* Cabeçalho com setas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-red-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <h2 className="text-sm font-bold text-white">Próximas aulas</h2>
            <p className="text-xs text-red-100">{index + 1} de {items.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={prevDisabled}
            aria-label="Aula anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={nextDisabled}
            aria-label="Próxima aula"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo da aula atual */}
      <div className="flex flex-wrap items-center gap-5 px-6 py-5">
        {current.student?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.student.photo_url}
            alt={`Foto de ${current.student.name}`}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-red-100"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-700">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-neutral-900">
            {capitalizeName(current.student?.name ?? "Aluno")}
          </p>
          <p className="truncate text-sm text-neutral-500">
            {current.student?.goal ?? "Sem objetivo definido"}
            {current.student?.plan_name ? ` · ${current.student.plan_name}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={current.kind === "fixa" ? "violet" : "info"}>
              {current.kind === "fixa" ? "Aula fixa" : "Aula avulsa"}
            </Badge>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-neutral-900">{formatDateBR(current.date)}</p>
          <p className="text-xs capitalize text-neutral-500">{weekdayLabel(current.date)}</p>
          <p className="mt-1 inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">
            {formatTimeBR(current.start_time)} – {formatTimeBR(current.end_time)}
          </p>
        </div>
      </div>
    </section>
  );
}