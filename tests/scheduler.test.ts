import { describe, it, expect } from 'vitest';
import { calculateDiffDays, formatReminderMessage } from '../src/scheduler.js';
import { Task } from '../src/types.js';

describe('scheduler module', () => {
  it('should calculate difference in days correctly', () => {
    expect(calculateDiffDays('2026-12-01', '2026-12-04')).toBe(3);
    expect(calculateDiffDays('2026-12-01', '2026-12-03')).toBe(2);
    expect(calculateDiffDays('2026-12-01', '2026-12-02')).toBe(1);
    expect(calculateDiffDays('2026-12-01', '2026-12-01')).toBe(0);
  });

  it('should format reminder message correctly with catatan', () => {
    const task: Task = {
      id: 'task-1',
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

    const message = formatReminderMessage(task, 'H-2');
    expect(message).toBe(`⏰ Reminder tugas\n\n📌 Analisis Sistem — Basis Data\n🗓️ Deadline: 2 Desember 2026 (H-2)\n📝 bawa laporan cetak`);
  });

  it('should format reminder message correctly without catatan', () => {
    const task: Task = {
      id: 'task-2',
      nama_tugas: 'Praktikum Jaringan',
      mata_kuliah: 'Jarkom',
      deadline: '2026-12-05',
      catatan: null,
      status: 'belum',
      reminder_h3_sent: false,
      reminder_h2_sent: false,
      reminder_h1_sent: false,
      reminder_h0_sent: false,
    };

    const message = formatReminderMessage(task, 'H-3');
    expect(message).toBe(`⏰ Reminder tugas\n\n📌 Praktikum Jaringan — Jarkom\n🗓️ Deadline: 5 Desember 2026 (H-3)`);
  });
});
