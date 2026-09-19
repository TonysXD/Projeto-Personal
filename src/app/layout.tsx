import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Trainer Lucas | Aula Experimental Grátis",
  description:
    "Em 12 semanas no seu melhor shape com treino presencial e acompanhamento de perto. Avaliação física gratuita na primeira aula.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-white text-neutral-900">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-red-700 focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}