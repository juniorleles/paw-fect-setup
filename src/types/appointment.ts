export interface Appointment {
  id: string;
  user_id: string;
  pet_name: string;
  owner_name: string;
  owner_phone: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string;
  created_at: string;
  updated_at: string;
  confirmation_message_sent_at: string | null;
}

export type AppointmentInsert = Omit<Appointment, "id" | "created_at" | "updated_at" | "confirmation_message_sent_at">;
