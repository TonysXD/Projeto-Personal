import { describe, expect, it } from "vitest";
import { studentFormSchema } from "@/lib/validations/student";

const base = {
  name: "João da Silva",
  birth_date: "1995-06-15",
  whatsapp: "11999999999",
  email: "",
  gender: "",
  neighborhood: "",
  address: "",
  goal: "Hipertrofia",
  restrictions: "Nenhuma",
  fitness_level: "",
  training_experience: "",
  weekly_frequency: "",
  plan_name: "Mensal 3x",
  plan_price: "350",
  plan_start: "2026-09-01",
  plan_end: "2026-09-30",
  notes: "",
};

describe("studentFormSchema", () => {
  it("aceita um formulário válido", () => {
    expect(() => studentFormSchema.parse(base)).not.toThrow();
  });

  it("rejeita nome curto", () => {
    const bad = { ...base, name: "Ab" };
    const result = studentFormSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejeita WhatsApp com menos de 10 dígitos", () => {
    const bad = { ...base, whatsapp: "1199" };
    expect(studentFormSchema.safeParse(bad).success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const bad = { ...base, email: "not-an-email" };
    expect(studentFormSchema.safeParse(bad).success).toBe(false);
  });

  it("aceita e-mail vazio (opcional)", () => {
    expect(() => studentFormSchema.parse(base)).not.toThrow();
  });

  it("converte valor monetário com vírgula", () => {
    const parsed = studentFormSchema.parse({ ...base, plan_price: "350,90" });
    expect(parsed.plan_price).toBe(350.9);
  });
});