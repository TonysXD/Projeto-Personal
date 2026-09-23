// ============================================================
// Funções puras de saúde — testáveis e reutilizáveis
// ============================================================

export function calcBMI(weight: number, heightCm: number): number | null {
  if (!weight || !heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  return weight / (h * h);
}

export function calcAge(birth: string): number {
  const b = new Date(birth + "T12:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}