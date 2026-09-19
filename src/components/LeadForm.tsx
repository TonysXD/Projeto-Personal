"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";

const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

export default function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setStatus("loading");

    try {
      const res = await fetch(
        `https://formsubmit.co/ajax/${process.env.NEXT_PUBLIC_FORM_EMAIL}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="lead" className="bg-neutral-50">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-neutral-900">
          Agende sua aula experimental grátis
        </h2>
        <p className="mt-2 text-center text-neutral-600">
          Preencha os campos e receba a resposta em até 2 horas.
        </p>

        <form className="mt-8 space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg sm:p-8">
          <input type="hidden" name="_subject" value="Novo lead - Landing Personal Trainer" />
          <input type="hidden" name="_captcha" value="false" />

          <div>
            <label htmlFor="name" className={labelClasses}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Como podemos te chamar?"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className={labelClasses}>
              WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="goal" className={labelClasses}>
              Qual seu objetivo?
            </label>
            <select
              id="goal"
              name="goal"
              required
              className={inputClasses}
            >
              <option value="">Selecione...</option>
              <option value="emagrecer">Emagrecer</option>
              <option value="hipertrofia">Ganhar massa muscular</option>
              <option value="saude">Saúde e condicionamento</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-red-600 px-6 py-4 font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Enviando..." : "Quero minha aula grátis"}
          </button>

          {status === "success" && (
            <p
              role="status"
              className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800"
            >
              Recebemos seus dados! Entraremos em contato em até 2 horas.
            </p>
          )}

          {status === "error" && (
            <p
              role="alert"
              className="rounded-lg bg-neutral-100 p-3 text-center text-sm font-medium text-neutral-800"
            >
              Algo deu errado. Tente novamente ou chame no WhatsApp.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}