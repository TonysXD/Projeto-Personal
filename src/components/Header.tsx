"use client";

import { useState } from "react";

const links = [
  { href: "#inicio", label: "Início" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#resultados", label: "Resultados" },
  { href: "#faq", label: "FAQ" },
];

const linkClasses =
  "rounded-md text-sm font-medium text-neutral-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-700 bg-neutral-800 shadow-lg">
      <nav
        aria-label="Menu principal"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
      >
        <a
          href="#inicio"
          className="rounded-md text-xl font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Lucas <span className="text-red-500">Personal</span>
        </a>

        {/* Links do menu (desktop) */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className={linkClasses}>
              {link.label}
            </a>
          ))}
          <a
            href="#lead"
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Faça sua inscrição
          </a>
        </div>

        {/* Botão do menu (mobile) */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="rounded-lg p-2 text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 md:hidden"
        >
          {open ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Menu mobile aberto */}
      {open && (
        <div
          id="menu-mobile"
          className="border-t border-neutral-700 bg-neutral-800 px-6 pb-6 pt-2 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#lead"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-red-600 px-3 py-3 text-center text-base font-semibold text-white transition duration-200 hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Faça sua inscrição
            </a>
          </div>
        </div>
      )}
    </header>
  );
}