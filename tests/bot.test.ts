import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processIncomingMessage, normalizePhoneNumber, MESSAGES } from '../src/bot.js';
import { config } from '../src/config.js';
import * as db from '../src/db.js';
import { Task, ChatSession } from '../src/types.js';

// Mock Fonnte send Whatsapp message module
vi.mock('../src/fonnte.js', () => ({
  sendWhatsappMessage: vi.fn().mockResolvedValue({ success: true }),
}));

describe('bot state machine', () => {
  const sender = '628123456789';

  beforeEach(() => {
    vi.restoreAllMocks();
    config.allowedWaNumber = sender; // Match test sender
    vi.spyOn(db, 'resetSession').mockResolvedValue();
    vi.spyOn(db, 'upsertSession').mockResolvedValue();
  });

  it('should normalize phone numbers correctly', () => {
    expect(normalizePhoneNumber('08123456789')).toBe('628123456789');
    expect(normalizePhoneNumber('628123456789')).toBe('628123456789');
    expect(normalizePhoneNumber('+628123456789')).toBe('628123456789');
  });

  it('should handle "menu" command and return menu copy', async () => {
    vi.spyOn(db, 'getSession').mockResolvedValue(null);

    const reply = await processIncomingMessage(sender, 'menu');
    expect(reply).toContain('Halo! 👋 Ini bot catatan tugas kamu.');
  });

  it('should handle "bantuan" command and return help copy', async () => {
    vi.spyOn(db, 'getSession').mockResolvedValue(null);

    const reply = await processIncomingMessage(sender, 'bantuan');
    expect(reply).toContain('Panduan bot catatan tugas:');
  });

  it('should handle "1" command and start task form session', async () => {
    vi.spyOn(db, 'getSession').mockResolvedValue(null);

    const reply = await processIncomingMessage(sender, '1');
    expect(reply).toContain('Silahkan isi di bawah ini:');
    expect(db.upsertSession).toHaveBeenCalledWith({
      nomor_wa: sender,
      status_sesi: 'menunggu_form_tugas',
      konteks: null,
    });
  });

  it('should process task form submission successfully', async () => {
    const activeSession: ChatSession = {
      nomor_wa: sender,
      status_sesi: 'menunggu_form_tugas',
      updated_at: new Date().toISOString(),
    };
    vi.spyOn(db, 'getSession').mockResolvedValue(activeSession);

    const createdTask: Task = {
      id: 'task-123',
      nama_tugas: 'Analisis Sistem',
      mata_kuliah: 'Basis Data',
      deadline: '2026-12-02',
      catatan: 'bawa laporan cetak',
      status: 'belum',
      reminder_h3_sent: false,
      reminder_h2_sent: false,
      reminder_h1_sent: false,
      reminder_h0_sent: false,
    };

    vi.spyOn(db, 'insertTask').mockResolvedValue(createdTask);

    const formMessage = `nama: Analisis Sistem
matkul: Basis Data
deadline: 02-12-2026
catatan: bawa laporan cetak`;

    const reply = await processIncomingMessage(sender, formMessage);

    expect(reply).toContain('Tugas tersimpan ✅');
    expect(reply).toContain('Analisis Sistem — Basis Data');
    expect(reply).toContain('2 Desember 2026');
    expect(reply).toContain('bawa laporan cetak');
    expect(db.insertTask).toHaveBeenCalledWith({
      nama_tugas: 'Analisis Sistem',
      mata_kuliah: 'Basis Data',
      deadline: '2026-12-02',
      catatan: 'bawa laporan cetak',
    });
    expect(db.resetSession).toHaveBeenCalledWith(sender);
  });

  it('should return validation error message when form is invalid', async () => {
    const activeSession: ChatSession = {
      nomor_wa: sender,
      status_sesi: 'menunggu_form_tugas',
      updated_at: new Date().toISOString(),
    };
    vi.spyOn(db, 'getSession').mockResolvedValue(activeSession);

    const invalidForm = `nama: 
matkul: Basis Data
deadline: 02-12-2026`;

    const reply = await processIncomingMessage(sender, invalidForm);

    expect(reply).toContain('Ada yang belum pas nih:');
    expect(reply).toContain('nama: nama tugas tidak boleh kosong');
  });

  it('should handle "2" command and return task list', async () => {
    vi.spyOn(db, 'getSession').mockResolvedValue(null);

    const mockTasks: Task[] = [
      {
        id: '1',
        nama_tugas: 'Analisis Sistem',
        mata_kuliah: 'Basis Data',
        deadline: '2026-12-02',
        status: 'belum',
        reminder_h3_sent: false,
        reminder_h2_sent: false,
        reminder_h1_sent: false,
        reminder_h0_sent: false,
      },
    ];

    vi.spyOn(db, 'getActiveTasks').mockResolvedValue(mockTasks);

    const reply = await processIncomingMessage(sender, '2');
    expect(reply).toContain('Tugas kamu yang belum selesai:');
    expect(reply).toContain('1. Analisis Sistem — Basis Data (2 Des)');
  });

  it('should handle completion flow (command "3" -> number selection)', async () => {
    const activeSession: ChatSession = {
      nomor_wa: sender,
      status_sesi: 'menunggu_pilih_selesai',
      konteks: { '1': 'uuid-task-1' },
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(db, 'getSession').mockResolvedValue(activeSession);
    vi.spyOn(db, 'markTaskCompleted').mockResolvedValue({
      id: 'uuid-task-1',
      nama_tugas: 'Analisis Sistem',
      mata_kuliah: 'Basis Data',
      deadline: '2026-12-02',
      status: 'selesai',
      reminder_h3_sent: false,
      reminder_h2_sent: false,
      reminder_h1_sent: false,
      reminder_h0_sent: false,
    });

    const reply = await processIncomingMessage(sender, '1');
    expect(reply).toContain('Mantap 🎉 "Analisis Sistem" ditandai selesai.');
    expect(db.markTaskCompleted).toHaveBeenCalledWith('uuid-task-1');
  });

  it('should handle deletion flow (command "4" -> number selection)', async () => {
    const activeSession: ChatSession = {
      nomor_wa: sender,
      status_sesi: 'menunggu_pilih_hapus',
      konteks: { '1': 'uuid-task-1' },
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(db, 'getSession').mockResolvedValue(activeSession);
    vi.spyOn(db, 'deleteTask').mockResolvedValue({
      id: 'uuid-task-1',
      nama_tugas: 'Analisis Sistem',
      mata_kuliah: 'Basis Data',
      deadline: '2026-12-02',
      status: 'belum',
      reminder_h3_sent: false,
      reminder_h2_sent: false,
      reminder_h1_sent: false,
      reminder_h0_sent: false,
    });

    const reply = await processIncomingMessage(sender, '1');
    expect(reply).toContain('Tugas "Analisis Sistem" sudah dihapus.');
    expect(db.deleteTask).toHaveBeenCalledWith('uuid-task-1');
  });
});
