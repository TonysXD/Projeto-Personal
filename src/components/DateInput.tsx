"use client";

import { useEffect, useState } from "react";

// Só deixa dígitos e aplica a máscara dd/mm/aaaa
function applyMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Valida se a data ISO existe de verdade (ex.: 31/02 é inválido)
function isValidDate(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export default function DateInput({
  value,
  onChange,
  id,
  className,
  required = false,
}: {
  value: string; // formato ISO YYYY-MM-DD ou vazio
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  function toDMY(iso: string) {
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function toISO(dmy: string) {
    const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "";
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  // Sincroniza o texto quando o valor externo muda (e não estamos digitando)
  useEffect(() => {
    if (!focused) setText(value ? toDMY(value) : "");
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value);
    setText(masked);
    const iso = toISO(masked);
    onChange(isValidDate(iso) ? iso : ""); // só emite data válida
  }

  function handleBlur() {
    setFocused(false);
    const iso = toISO(text);
    if (text && !isValidDate(iso)) {
      setText(""); // data incompleta/inválida é limpa
      onChange("");
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={10}
      placeholder="dd/mm/aaaa"
      value={text}
      required={required}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      className={className}
    />
  );
}