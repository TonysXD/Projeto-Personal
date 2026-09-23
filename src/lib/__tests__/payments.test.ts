import { describe, expect, it } from "vitest";
import { paymentStatus, formatMoney } from "@/lib/payments";

describe("paymentStatus", () => {
  const today = "2026-09-23";

  it("retorna pago quando o status é pago", () => {
    expect(paymentStatus({ status: "pago", due_date: "2026-09-10" }, today)).toBe("pago");
  });

  it("retorna cancelado quando o status é cancelado", () => {
    expect(paymentStatus({ status: "cancelado", due_date: "2026-09-10" }, today)).toBe("cancelado");
  });

  it("retorna atrasado quando venceu e não foi pago", () => {
    expect(paymentStatus({ status: "pendente", due_date: "2026-09-20" }, today)).toBe("atrasado");
  });

  it("retorna pendente quando ainda não venceu", () => {
    expect(paymentStatus({ status: "pendente", due_date: "2026-09-30" }, today)).toBe("pendente");
  });

  it("retorna pendente quando vence hoje", () => {
    expect(paymentStatus({ status: "pendente", due_date: "2026-09-23" }, today)).toBe("pendente");
  });
});

describe("formatMoney", () => {
  it("formata valor em reais com duas casas", () => {
    expect(formatMoney(350)).toBe("R$ 350,00");
  });

  it("formata valor com centavos", () => {
    expect(formatMoney(350.5)).toBe("R$ 350,50");
  });

  it("formata valor grande com separador de milhar", () => {
    expect(formatMoney(1250)).toBe("R$ 1.250,00");
  });
});