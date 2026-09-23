"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR, capitalizeName } from "@/lib/format";
import DateInput from "@/components/DateInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

type Payment = {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
  method: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

type Student = {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
  plan_name: string | null;
  plan_price: number | null;
  plan_end: string | null;
};

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const emptyForm = {
  student_id: "",
  due_date: "",
  amount: "",
  method: "",
  notes: "",
};

type PaymentStatus = "pago" | "atrasado" | "pendente" | "cancelado";

const statusBadge: Record<PaymentStatus, { variant: "success" | "danger" | "warning" | "neutral"; label: string }> = {
  pago: { variant: "success", label: "Pago" },
  atrasado: { variant: "danger", label: "Atrasado" },
  pendente: { variant: "warning", label: "Pendente" },
  cancelado: { variant: "neutral", label: "Cancelado" },
};

export default function PaymentsClient({
  initialPayments,
  students,
}: {
  initialPayments: Payment[];
  students: Student[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [filter, setFilter] = useState<"todos" | PaymentStatus>("todos");
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, s.name);
    return map;
  }, [students]);

  const paymentStatus = (p: Payment): PaymentStatus => {
    if (p.status === "pago") return "pago";
    if (p.status === "cancelado") return "cancelado";
    if (p.due_date < todayISO()) return "atrasado";
    return "pendente";
  };

  const filtered = useMemo(() => {
    if (filter === "todos") return payments;
    return payments.filter((p) => paymentStatus(p) === filter);
  }, [payments, filter]);

  const totals = useMemo(() => {
    let aReceber = 0;
    let pagos = 0;
    let atrasados = 0;
    let pendentes = 0;
    for (const p of payments) {
      const s = paymentStatus(p);
      if (s === "cancelado") continue;
      if (s === "pago") pagos += p.amount;
      if (s === "atrasado") atrasados += p.amount;
      if (s === "pendente") pendentes += p.amount;
    }
    aReceber = atrasados + pendentes;
    return { aReceber, pagos, atrasados, pendentes };
  }, [payments]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function markAsPaid(payment: Payment) {
    const { error: err } = await supabase
      .from("payments")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (!err) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: "pago", paid_at: new Date().toISOString() }
            : p
        )
      );
      router.refresh();
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.student_id || !form.due_date || !form.amount) {
      setError("Aluno, vencimento e valor são obrigatórios.");
      return;
    }

    setSaving(true);

    const { error: err } = await supabase.from("payments").insert({
      student_id: form.student_id,
      due_date: form.due_date,
      amount: parseFloat(form.amount.replace(",", ".")),
      method: form.method || null,
      status: "pendente",
      notes: form.notes || null,
    });

    if (err) {
      setError("Não foi possível salvar o pagamento. Tente novamente.");
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setModalOpen(false);
    setSaving(false);
    router.refresh();
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Pagamentos</h1>
        <Button variant="danger" onClick={() => setModalOpen(true)}>
          + Novo pagamento
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total pago">
          <p className="text-2xl font-bold text-green-700">{formatMoney(totals.pagos)}</p>
        </Card>
        <Card title="A receber">
          <p className="text-2xl font-bold text-neutral-900">{formatMoney(totals.aReceber)}</p>
        </Card>
        <Card title="Pendentes">
          <p className="text-2xl font-bold text-amber-700">{formatMoney(totals.pendentes)}</p>
        </Card>
        <Card title="Atrasados">
          <p className="text-2xl font-bold text-red-700">{formatMoney(totals.atrasados)}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(["todos", "pendente", "atrasado", "pago", "cancelado"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f === "todos"
              ? "Todos"
              : f === "pago"
              ? "Pagos"
              : f === "atrasado"
              ? "Atrasados"
              : f === "pendente"
              ? "Pendentes"
              : "Cancelados"}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length ? (
              filtered.map((p) => {
                const status = paymentStatus(p);
                const badge = statusBadge[status];
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${p.student_id}`}
                        className="font-medium text-neutral-900 hover:text-red-600"
                      >
                        {capitalizeName(studentName.get(p.student_id)) || "Aluno removido"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDateBR(p.due_date)}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {p.method ? METHOD_LABELS[p.method] ?? p.method : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant} dot>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== "pago" && p.status !== "cancelado" ? (
                        <Button
                          variant="success"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => markAsPaid(p)}
                        >
                          Marcar como pago
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="Nenhum pagamento encontrado"
                    description={
                      filter !== "todos"
                        ? `Não há pagamentos com o status "${filter}".`
                        : "Cadastre o primeiro pagamento para começar a controlar as finanças."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de novo pagamento */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Novo pagamento"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeModal}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              type="submit"
              form="pay-form"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar pagamento"}
            </Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={handleCreate} className="space-y-4">
          <Select
            id="pay-student"
            label="Aluno *"
            value={form.student_id}
            onChange={(e) => set("student_id", e.target.value)}
            required
          >
            <option value="">Selecione o aluno...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {capitalizeName(s.name)}
                {s.status === "inativo" ? " (inativo)" : ""}
              </option>
            ))}
          </Select>

          <div>
            <label htmlFor="pay-due" className="mb-1.5 block text-sm font-semibold text-neutral-800">
              Vencimento *
            </label>
            <DateInput
              id="pay-due"
              value={form.due_date}
              onChange={(iso) => set("due_date", iso)}
              required
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600"
            />
          </div>

          <Input
            id="pay-amount"
            label="Valor *"
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />

          <Select
            id="pay-method"
            label="Método de pagamento"
            value={form.method}
            onChange={(e) => set("method", e.target.value)}
          >
            <option value="">Selecione...</option>
            {Object.entries(METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>

          <Input
            id="pay-notes"
            label="Notas"
            placeholder="opcional"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}