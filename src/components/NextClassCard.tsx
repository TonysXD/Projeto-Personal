'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CARD DA PRÓXIMA AULA — Painel de Visão Geral
// Busca a aula mais próxima (status ativo) e mostra o aluno
// com foto de perfil, data e hora em destaque.
// ============================================================

// ⚠️ Se suas variáveis de ambiente tiverem outro nome,
// ajuste aqui (ex.: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NextClass = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  student: {
    name: string;
    avatar_url: string | null;
  } | null;
};

export default function NextClassCard() {
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchNextClass() {
      try {
        // ============================================================
        // CONSULTA: próxima aula com status ativo
        // ⚠️ Confira os valores permitidos do seu CHECK constraint.
        // Se o seu sistema usa 'confirmado' / 'agendado' / 'ativo',
        // mantenha. Se usa outro valor, troque no array abaixo.
        // ============================================================
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time,
            type,
            status,
            student:student_id (
              name,
              avatar_url
            )
          `)
          .in('status', ['agendado', 'confirmado'])
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        setNextClass(data as NextClass | null);
      } catch (err) {
        console.error('Erro ao buscar próxima aula:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchNextClass();
  }, []);

  // ---------- Estados de carregamento / erro / vazio ----------
  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Não foi possível carregar a próxima aula.
      </div>
    );
  }

  if (!nextClass) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Nenhuma aula agendada para os próximos dias.
      </div>
    );
  }

  // ---------- Formatação de data e hora ----------
  const dateObj = new Date(`${nextClass.date}T00:00:00`);
  const day = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });

  const timeFormatted = nextClass.time
    ? nextClass.time.slice(0, 5)
    : '--:--';

  const studentName = nextClass.student?.name ?? 'Aluno';
  const avatar = nextClass.student?.avatar_url ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Cabeçalho do card */}
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Próxima aula
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Agendada
        </span>
      </header>

      {/* Corpo do card */}
      <div className="flex items-center gap-5 px-6 py-6">
        {/* Foto do aluno */}
        <div className="relative shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={`Foto de ${studentName}`}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xl font-bold text-white">
              {studentName.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
        </div>

        {/* Nome + tipo de aula */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900">
            {studentName}
          </p>
          <p className="text-sm text-slate-500">
            {nextClass.type ? `Aula de ${nextClass.type}` : 'Aula particular'}
          </p>
        </div>

        {/* Data e hora em destaque */}
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold leading-none text-slate-900">
            {day} <span className="text-base font-semibold text-emerald-600">{month}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">{weekday}</p>
          <p className="mt-1 inline-block rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-semibold text-white">
            {timeFormatted}
          </p>
        </div>
      </div>
    </section>
  );
}