"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const titles: Record<string, string> = {
  "/admin": "Visão geral",
  "/admin/students": "Alunos",
  "/admin/students/new": "Novo aluno",
  "/admin/payments": "Pagamentos",
  "/admin/appointments": "Agenda",
};

const mobileLinks = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/students", label: "Alunos" },
  { href: "/admin/appointments", label: "Agenda" },
  { href: "/admin/payments", label: "Pagamentos" },
];

function getTitle(pathname: string) {
  if (pathname.startsWith("/admin/students/") && !pathname.endsWith("/new")) {
    return "Perfil do aluno";
  }
  return titles[pathname] ?? "Painel";
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <Link href="/admin" className="text-lg font-bold text-neutral-900 lg:hidden">
          Lucas Personal
        </Link>
        <h1 className="hidden truncate text-lg font-bold text-neutral-900 lg:block">
          {getTitle(pathname)}
        </h1>
        <button
          onClick={signOut}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 lg:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
        {mobileLinks.map((l) => {
          const active =
            l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}