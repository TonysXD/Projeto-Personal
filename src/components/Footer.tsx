export default function Footer() {
  return (
    <footer className="bg-black py-8 text-center text-sm text-neutral-400">
      <p>
        © {new Date().getFullYear()} Personal Trainer Lucas · Todos os direitos
        reservados
      </p>
    </footer>
  );
}