/* ============================================================
   Utilitário de WhatsApp — normaliza o número e gera o link
   wa.me para abrir conversa direta com o aluno.
   ============================================================ */

/**
 * Normaliza o número de WhatsApp para o formato internacional
 * usado pelo wa.me (código do país 55 + DDD + número).
 * Aceita qualquer máscara: "(11) 99999-9999", "11 99999-9999",
 * "11999999999", "+55 11 99999-9999", etc.
 *
 * Retorna null se o número for inválido (menos de 10 dígitos).
 */
export function normalizeWhatsApp(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let num = digits;

  // Remove o código do país se já estiver presente
  if (num.startsWith("55")) {
    num = num.slice(2);
  }

  // Remove zero à esquerda (ex.: 011 -> 11)
  if (num.startsWith("0")) {
    num = num.slice(1);
  }

  // Celular brasileiro: 11 dígitos (DDD + 9 + número)
  // Fixo: 10 dígitos. Menos que isso é inválido.
  if (num.length < 10 || num.length > 11) return null;

  return `55${num}`;
}

/**
 * Gera o link de conversa do WhatsApp.
 * Se houver mensagem, ela é pré-preenchida no campo de texto.
 * Retorna null se o número for inválido.
 */
export function whatsAppLink(
  raw: string | null | undefined,
  message?: string
): string | null {
  const num = normalizeWhatsApp(raw);
  if (!num) return null;

  const base = `https://wa.me/${num}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}