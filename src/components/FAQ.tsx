"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Preciso de equipamento para começar?",
    answer: "Não. Os treinos usam o que você tem em casa ou o equipamento do estúdio.",
  },
  {
    question: "Atende a domicílio?",
    answer: "Sim, atendo na Zona Sul e região. Também há atendimento no estúdio.",
  },
  {
    question: "Qual o valor da mensalidade?",
    answer: "O valor depende da frequência e do local. Preencha o formulário e receba a proposta.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold text-neutral-900">
        Perguntas frequentes
      </h2>
      <div className="mt-10 space-y-3">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          const buttonId = `faq-button-${index}`;
          const panelId = `faq-panel-${index}`;

          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
            >
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 bg-white p-5 text-left text-neutral-900 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-red-600"
              >
                <span className="font-semibold">{item.question}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-5 w-5 shrink-0 text-red-600 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="border-t border-neutral-100 px-5 pb-5 pt-4 text-neutral-600">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}