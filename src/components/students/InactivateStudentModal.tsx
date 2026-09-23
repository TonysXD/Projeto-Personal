"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type InactivateStudentModalProps = {
  open: boolean;
  onClose: () => void;
  studentName: string;
  inactivating: boolean;
  error: string | null;
  onConfirm: () => void;
};

export default function InactivateStudentModal({
  open,
  onClose,
  studentName,
  inactivating,
  error,
  onConfirm,
}: InactivateStudentModalProps) {
  const [typed, setTyped] = useState("");
  const canInactivate = typed.trim().toUpperCase() === "INATIVAR";

  // Reseta o campo toda vez que o modal abre
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inativar aluno"
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={inactivating}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={!canInactivate || inactivating}
          >
            {inactivating ? "Inativando..." : "Inativar aluno"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        Você está prestes a inativar <strong>{studentName}</strong>. Esta ação:
      </p>
      <ul className="mt-3 list-inside space-y-1 text-sm text-neutral-600">
        <li>• Cancela as aulas agendadas (elas saem da agenda);</li>
        <li>• Cancela os pagamentos pendentes;</li>
        <li>• Encerra a vigência do plano na data de hoje;</li>
        <li>• Deve ser usada apenas quando tudo estiver acertado entre aluno e personal.</li>
      </ul>
      <p className="mt-3 text-sm text-neutral-600">
        O histórico (pagamentos, evolução, fotos) é preservado. O aluno poderá ser reativado depois.
      </p>
      <div className="mt-4">
        <Input
          id="confirm-inactivate"
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          placeholder="INATIVAR"
          autoComplete="off"
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </Modal>
  );
}