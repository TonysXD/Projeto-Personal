// ============================================================
// Tipos centralizados do domínio
// ============================================================

export type StudentStatus = "ativo" | "inativo";

export type Student = {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  neighborhood: string | null;
  address: string | null;
  goal: string | null;
  restrictions: string | null;
  fitness_level: string | null;
  training_experience: string | null;
  weekly_frequency: number | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_start: string | null;
  plan_end: string | null;
  status: StudentStatus;
  notes: string | null;
  photo_url: string | null;
};

export type EvolutionPhoto = {
  id: string;
  url: string;
};

export type EvolutionRecord = {
  id: string;
  student_id: string;
  record_date: string;
  weight: number | null;
  height: number | null;
  height_source: string | null;
  body_fat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
  evolution_photos?: EvolutionPhoto[];
};

export type PaymentStatus = "pago" | "pendente" | "cancelado";

export type PaymentMethod = "dinheiro" | "cartao" | "transferencia" | null;

export type Payment = {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
};

export type AppointmentStatus = "agendado" | "concluido" | "cancelado";

export type Appointment = {
  id: string;
  student_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  active: boolean;
  reason: string | null;
};

export type ScheduleSlot = {
  id: string;
  student_id: string;
  active: boolean;
  reason: string | null;
};