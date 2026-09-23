import { describe, expect, it } from "vitest";
import { calcBMI, calcAge } from "@/lib/health";

describe("calcBMI", () => {
  it("calcula o IMC corretamente", () => {
    // 70kg / 1,75m² = 22,86
    expect(calcBMI(70, 175)).toBeCloseTo(22.86, 1);
  });

  it("retorna null quando peso é zero ou ausente", () => {
    expect(calcBMI(0, 175)).toBeNull();
  });

  it("retorna null quando altura é inválida", () => {
    expect(calcBMI(70, 0)).toBeNull();
    expect(calcBMI(70, -5)).toBeNull();
  });
});

describe("calcAge", () => {
  function yearsAgoISO(years: number) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("retorna a idade correta para alguém nascido há 20 anos", () => {
    expect(calcAge(yearsAgoISO(20))).toBe(20);
  });

  it("retorna a idade correta para alguém nascido há 30 anos", () => {
    expect(calcAge(yearsAgoISO(30))).toBe(30);
  });
});