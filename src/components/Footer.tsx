import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black py-8 text-center text-sm text-neutral-400">
      <p>
        © {new Date().getFullYear()} Personal Trainer Lucas · Todos os direitos
        reservados
      </p>
      <Link
        href="/login"
        className="mt-3 inline-block text-xs text-neutral-600 transition-colors hover:text-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        Área do treinador
      </Link>
    </footer>
  );
}