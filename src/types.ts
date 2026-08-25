export interface Task {
  id: string;
  nama_tugas: string;
  mata_kuliah: string;
  deadline: string; // YYYY-MM-DD
  catatan?: string | null;
  status: 'belum' | 'selesai';
  reminder_h3_sent: boolean;
  reminder_h2_sent: boolean;
  reminder_h1_sent: boolean;
  reminder_h0_sent: boolean;
  created_at?: string;
}

export type SessionStatus =
  | 'menunggu_form_tugas'
  | 'menunggu_pilih_selesai'
  | 'menunggu_pilih_hapus'
  | null;

export interface ChatSession {
  nomor_wa: string;
  status_sesi: SessionStatus;
  konteks?: Record<string, string> | null; // mapping e.g. {"1": "uuid-1", "2": "uuid-2"}
  updated_at: string;
}

export interface FonnteWebhookPayload {
  device?: string;
  sender?: string;
  message?: string;
  text?: string; // Fonnte can send payload text or message
  secret?: string;
}

export interface ParsedTaskForm {
  nama: string;
  matkul: string;
  deadlineStr: string; // original input DD-MM-YYYY
  deadlineIso: string; // YYYY-MM-DD for DB
  catatan?: string;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedTaskForm;
  errors?: string[];
}
