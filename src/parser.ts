import { ParseResult, ParsedTaskForm } from './types.js';

const INDONESIAN_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Validates whether a DD-MM-YYYY string is a real calendar date.
 */
export function isValidCalendarDate(ddStr: string, mmStr: string, yyyyStr: string): boolean {
  const dd = parseInt(ddStr, 10);
  const mm = parseInt(mmStr, 10);
  const yyyy = parseInt(yyyyStr, 10);

  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return false;
  if (mm < 1 || mm > 12) return false;
  if (yyyy < 2000 || yyyy > 2100) return false;

  // New Date(yyyy, mm, 0).getDate() gives total days in that month
  const maxDays = new Date(yyyy, mm, 0).getDate();
  return dd >= 1 && dd <= maxDays;
}

/**
 * Parses user message containing key: value form for new task.
 */
export function parseTaskForm(text: string): ParseResult {
  const lines = text.split('\n');
  const parsedMap: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();
      parsedMap[key] = val;
    }
  }

  const errors: string[] = [];

  const nama = parsedMap['nama'] || '';
  const matkul = parsedMap['matkul'] || '';
  const deadline = parsedMap['deadline'] || '';
  const catatan = parsedMap['catatan'] || undefined;

  if (!nama) {
    errors.push('nama: nama tugas tidak boleh kosong');
  }

  if (!matkul) {
    errors.push('matkul: mata kuliah tidak boleh kosong');
  }

  let deadlineIso = '';
  if (!deadline) {
    errors.push('deadline: format harus tgl-bln-thn, contoh 02-12-2026');
  } else {
    const deadlineRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = deadline.match(deadlineRegex);

    if (!match) {
      errors.push('deadline: format harus tgl-bln-thn, contoh 02-12-2026');
    } else {
      const [, dd, mm, yyyy] = match;
      if (!isValidCalendarDate(dd, mm, yyyy)) {
        errors.push('deadline: tanggal tidak valid pada kalender, contoh 02-12-2026');
      } else {
        deadlineIso = `${yyyy}-${mm}-${dd}`;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      nama,
      matkul,
      deadlineStr: deadline,
      deadlineIso,
      catatan: catatan ? catatan : undefined,
    },
  };
}

/**
 * Formats YYYY-MM-DD into Indonesian full date string, e.g. "2026-12-02" -> "2 Desember 2026"
 */
export function formatIndonesianFullDate(isoDateStr: string): string {
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10).toString();

  const monthName = INDONESIAN_MONTHS_FULL[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Formats YYYY-MM-DD into Indonesian short date string, e.g. "2026-12-02" -> "2 Des"
 */
export function formatIndonesianShortDate(isoDateStr: string): string {
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10).toString();

  const monthName = INDONESIAN_MONTHS_SHORT[monthIdx] || parts[1];
  return `${day} ${monthName}`;
}
