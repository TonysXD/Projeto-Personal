import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { capitalizeName } from "@/lib/format";
import DeleteStudentButton from "@/components/students/DeleteStudentButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, name, whatsapp, goal, plan_name, status, photo_url")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Alunos</h1>
        <Link
          href="/admin/students/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98]"
        >
          + Novo aluno
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {students?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Objetivo</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img
                          src={s.photo_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-500">
                          {s.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                      )}
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="font-medium text-neutral-900 hover:text-red-600"
                      >
                        {capitalizeName(s.name)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{s.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.goal ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.plan_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === "ativo" ? "success" : "danger"} dot>
                      {s.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteStudentButton studentId={s.id} studentName={s.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="Nenhum aluno cadastrado ainda"
            description="Cadastre seu primeiro aluno para começar a acompanhar evolução, agenda e pagamentos."
            action={
              <Link
                href="/admin/students/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                + Novo aluno
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}