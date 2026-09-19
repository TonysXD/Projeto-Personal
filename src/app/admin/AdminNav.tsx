"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/students", label: "Alunos" },
  { href: "/admin/payments", label: "Pagamentos" },
  { href: "/admin/appointments", label: "Agenda" },
];

export default function AdminNav() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-neutral-900 text-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/admin" className="text-lg font-bold">
          Lucas <span className="text-red-500">Personal</span> · Painel
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-neutral-300 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}