import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteStudentButton from "./DeleteStudentButton";

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
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          + Novo aluno
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
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
            {students?.length ? (
              students.map((s) => (
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
                        {s.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{s.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.goal ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.plan_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        s.status === "ativo"
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteStudentButton studentId={s.id} studentName={s.name} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Nenhum aluno cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}