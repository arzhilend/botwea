-- Schema untuk Bot Catatan Tugas WhatsApp

CREATE TABLE IF NOT EXISTS tugas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_tugas TEXT NOT NULL,
    mata_kuliah TEXT NOT NULL,
    deadline DATE NOT NULL,
    catatan TEXT,
    status TEXT NOT NULL DEFAULT 'belum',
    reminder_h3_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_h2_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_h1_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_h0_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesi_chat (
    nomor_wa TEXT PRIMARY KEY,
    status_sesi TEXT,
    konteks JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks untuk query tugas per deadline dan status
CREATE INDEX IF NOT EXISTS idx_tugas_status_deadline ON tugas (status, deadline);

-- Indeks untuk status sesi chat
CREATE INDEX IF NOT EXISTS idx_sesi_chat_updated_at ON sesi_chat (updated_at);
