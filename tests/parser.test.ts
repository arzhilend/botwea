import { describe, it, expect } from 'vitest';
import { parseTaskForm, formatIndonesianFullDate, formatIndonesianShortDate, isValidCalendarDate } from '../src/parser.js';

describe('parser module', () => {
  it('should parse valid task form correctly', () => {
    const input = `nama: Analisis Sistem
matkul: Basis Data
deadline: 02-12-2026
catatan: bawa laporan cetak`;

    const result = parseTaskForm(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      nama: 'Analisis Sistem',
      matkul: 'Basis Data',
      deadlineStr: '02-12-2026',
      deadlineIso: '2026-12-02',
      catatan: 'bawa laporan cetak',
    });
  });

  it('should handle optional empty catatan', () => {
    const input = `nama: Tugas 1
matkul: Algoritma
deadline: 15-05-2026`;

    const result = parseTaskForm(input);
    expect(result.success).toBe(true);
    expect(result.data?.catatan).toBeUndefined();
  });

  it('should fail when mandatory fields are missing', () => {
    const input = `nama: 
matkul: 
deadline: `;

    const result = parseTaskForm(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('nama: nama tugas tidak boleh kosong');
    expect(result.errors).toContain('matkul: mata kuliah tidak boleh kosong');
    expect(result.errors).toContain('deadline: format harus tgl-bln-thn, contoh 02-12-2026');
  });

  it('should fail when deadline format is invalid', () => {
    const input = `nama: Math
matkul: Calculus
deadline: 2026-12-02`;

    const result = parseTaskForm(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('deadline: format harus tgl-bln-thn, contoh 02-12-2026');
  });

  it('should fail when deadline is not a valid calendar date', () => {
    const input = `nama: Math
matkul: Calculus
deadline: 31-02-2026`;

    const result = parseTaskForm(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('deadline: tanggal tidak valid pada kalender, contoh 02-12-2026');
  });

  it('should validate leap years correctly', () => {
    expect(isValidCalendarDate('29', '02', '2024')).toBe(true); // 2024 is leap year
    expect(isValidCalendarDate('29', '02', '2026')).toBe(false); // 2026 is not leap year
  });

  it('should format full Indonesian date correctly', () => {
    expect(formatIndonesianFullDate('2026-12-02')).toBe('2 Desember 2026');
    expect(formatIndonesianFullDate('2026-08-05')).toBe('5 Agustus 2026');
  });

  it('should format short Indonesian date correctly', () => {
    expect(formatIndonesianShortDate('2026-12-02')).toBe('2 Des');
    expect(formatIndonesianShortDate('2026-12-05')).toBe('5 Des');
  });
});
