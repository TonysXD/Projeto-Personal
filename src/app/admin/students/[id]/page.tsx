import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudentProfile from "@/components/students/StudentProfile";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) {
    return (
      <div className="space-y-4">
        <Link href="/admin/students" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Alunos
        </Link>
        <p className="text-neutral-600">Aluno não encontrado.</p>
      </div>
    );
  }

  const { data: evolution } = await supabase
    .from("evolution")
    .select("*, evolution_photos(id, url)")
    .eq("student_id", id)
    .order("record_date", { ascending: false });

  return (
    <div className="space-y-4">
      <Link href="/admin/students" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Alunos
      </Link>
      <StudentProfile student={student} evolution={evolution ?? []} />
    </div>
  );
}