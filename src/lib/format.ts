// Utilitários de formatação — horário do Brasil (America/Sao_Paulo)

const PARTICLES = new Set([
  "de", "da", "do", "dos", "das", "e", "em", "no", "na", "nos", "nas",
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "com", "por", "para",
]);

export function capitalizeName(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed
    .split(" ")
    .map((word, index) => {
      // Preserva siglas / palavras já totalmente em maiúsculas (USP, ONG, T.I.)
      if (word === word.toUpperCase() && word.length > 1) return word;
      const lower = word.toLowerCase();
      // Partículas ficam minúsculas quando não são a primeira palavra
      if (PARTICLES.has(lower) && index !== 0) return lower;
      // Nomes hifenizados: joão-paulo -> João-Paulo
      return word
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("-");
    })
    .join(" ");
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Date-only (YYYY-MM-DD): parse ao meio-dia para evitar deslocamento de dia por fuso
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}