import { describe, expect, it } from "vitest";
import { normalizeWhatsApp, whatsAppLink } from "@/lib/whatsapp";

describe("normalizeWhatsApp", () => {
  it("normaliza número com máscara de parênteses e espaço", () => {
    expect(normalizeWhatsApp("(11) 99999-9999")).toBe("5511999999999");
  });

  it("normaliza número com espaços simples", () => {
    expect(normalizeWhatsApp("11 99999-9999")).toBe("5511999999999");
  });

  it("normaliza número sem máscara", () => {
    expect(normalizeWhatsApp("11999999999")).toBe("5511999999999");
  });

  it("normaliza número com +55", () => {
    expect(normalizeWhatsApp("+55 11 99999-9999")).toBe("5511999999999");
  });

  it("não duplica o prefixo 55", () => {
    expect(normalizeWhatsApp("5511999999999")).toBe("5511999999999");
  });

  it("remove o zero à esquerda do DDD", () => {
    expect(normalizeWhatsApp("011999999999")).toBe("5511999999999");
  });

  it("retorna null para número curto demais (9 dígitos)", () => {
    expect(normalizeWhatsApp("119999999")).toBeNull();
  });

  it("retorna null para vazio, null e undefined", () => {
    expect(normalizeWhatsApp("")).toBeNull();
    expect(normalizeWhatsApp(null)).toBeNull();
    expect(normalizeWhatsApp(undefined)).toBeNull();
  });
});

describe("whatsAppLink", () => {
  it("gera o link wa.me com número normalizado", () => {
    expect(whatsAppLink("(11) 99999-9999")).toBe("https://wa.me/5511999999999");
  });

  it("gera o link com mensagem codificada", () => {
    expect(whatsAppLink("11999999999", "Olá! Tudo bem?"))
      .toBe("https://wa.me/5511999999999?text=Ol%C3%A1!%20Tudo%20bem%3F");
  });

  it("retorna null quando o número é inválido", () => {
    expect(whatsAppLink("123")).toBeNull();
  });
});