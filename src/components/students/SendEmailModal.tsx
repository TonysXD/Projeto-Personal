"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type SendEmailModalProps = {
  open: boolean;
  onClose: () => void;
  studentName: string;
  initialEmail: string;
  sending: boolean;
  message: { ok: boolean; text: string } | null;
  onSend: (email: string) => void;
};

export default function SendEmailModal({
  open,
  onClose,
  studentName,
  initialEmail,
  sending,
  message,
  onSend,
}: SendEmailModalProps) {
  const [emailTo, setEmailTo] = useState(initialEmail);

  // Preenche com o e-mail do aluno toda vez que abre
  useEffect(() => {
    if (open) setEmailTo(initialEmail);
  }, [open, initialEmail]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar relatório por e-mail"
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => onSend(emailTo)}
            disabled={!emailTo.trim() || sending}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        O PDF de evolução de <strong>{studentName}</strong> será enviado em anexo.
      </p>
      <div className="mt-4">
        <Input
          id="report-email"
          type="email"
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
          placeholder="email@exemplo.com"
        />
      </div>
      {message && (
        <p
          className={`mt-3 rounded-lg p-3 text-center text-sm font-medium ${
            message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}
    </Modal>
  );
}