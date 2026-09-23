// ============================================================
// Funções puras de pagamento — testáveis e reutilizáveis
// ============================================================

export type PaymentStatus = "pago" | "atrasado" | "pendente" | "cancelado";

export type PaymentForStatus = {
  status: string;
  due_date: string;
};

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function paymentStatus(p: PaymentForStatus, today: string = todayISO()): PaymentStatus {
  if (p.status === "pago") return "pago";
  if (p.status === "cancelado") return "cancelado";
  if (p.due_date < today) return "atrasado";
  return "pendente";
}

export function formatMoney(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}