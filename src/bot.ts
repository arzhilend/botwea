import { config } from './config.js';
import * as db from './db.js';
import { parseTaskForm, formatIndonesianFullDate, formatIndonesianShortDate } from './parser.js';
import { sendWhatsappMessage } from './fonnte.js';
import { Task } from './types.js';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

export function isNumberAllowed(sender: string): boolean {
  // If ALLOWED_WA_NUMBER is not set, empty, or set to 'all'/'*', allow anyone to use the bot!
  if (!config.allowedWaNumber || config.allowedWaNumber === '*' || config.allowedWaNumber.toLowerCase() === 'all') {
    return true;
  }
  const normalizedSender = normalizePhoneNumber(sender);
  const normalizedAllowed = normalizePhoneNumber(config.allowedWaNumber);
  return normalizedSender === normalizedAllowed;
}

export const MESSAGES = {
  MENU: `Halo! 👋 Ini bot catatan tugas kamu.

1️⃣ Catat tugas baru
2️⃣ Lihat tugas
3️⃣ Tandai selesai
4️⃣ Hapus tugas

Ketik angkanya, atau "bantuan" kalau butuh panduan.`,

  BANTUAN: `Panduan bot catatan tugas:

1️⃣ Catat tugas baru — isi form nama/matkul/deadline/catatan
2️⃣ Lihat tugas — liat daftar yang belum selesai
3️⃣ Tandai selesai — tandai tugas yang udah kelar
4️⃣ Hapus tugas — hapus tugas dari daftar

Ketik "menu" kapan aja buat balik ke awal.`,

  FORM_TEMPLATE: `Silahkan isi di bawah ini:

nama: 
matkul: 
deadline: 
catatan: 

(format deadline: tgl-bln-thn, contoh 02-12-2026. Baris catatan boleh dikosongkan)`,

  EMPTY_LIST: `Belum ada tugas yang tercatat. Ketik "1" buat nyatet tugas baru.`,
};

export async function processIncomingMessage(sender: string, text: string): Promise<string> {
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  // 1. Security Whitelist Check (Allow all if ALLOWED_WA_NUMBER is empty or '*')
  if (!isNumberAllowed(sender)) {
    console.warn(`[UNAUTHORIZED] Message rejected from: ${sender}`);
    return 'Maaf, nomor Anda tidak terdaftar sebagai pemilik bot ini.';
  }

  // 2. Fetch Session & Check Timeout (>10 minutes)
  let session = await db.getSession(sender);
  if (session && session.updated_at) {
    const updatedAt = new Date(session.updated_at).getTime();
    if (Date.now() - updatedAt > SESSION_TIMEOUT_MS) {
      await db.resetSession(sender);
      session = null;
    }
  }

  // 3. Absolute Interrupter Commands (always reset session & return menu/help)
  if (lowerText === 'menu' || lowerText === '0') {
    await db.resetSession(sender);
    await sendWhatsappMessage({ target: sender, message: MESSAGES.MENU });
    return MESSAGES.MENU;
  }

  if (lowerText === 'bantuan' || lowerText === 'help') {
    await db.resetSession(sender);
    await sendWhatsappMessage({ target: sender, message: MESSAGES.BANTUAN });
    return MESSAGES.BANTUAN;
  }

  // 4. Active Session Processing (if user is currently in a multi-step flow)
  if (session && session.status_sesi) {
    if (session.status_sesi === 'menunggu_form_tugas') {
      const parseResult = parseTaskForm(trimmedText);

      if (!parseResult.success) {
        const errorLines = (parseResult.errors || []).map(err => `- ${err}`).join('\n');
        const reply = `Ada yang belum pas nih:\n${errorLines}\n\nSilahkan kirim ulang isian lengkapnya ya.`;
        await sendWhatsappMessage({ target: sender, message: reply });
        return reply;
      }

      const formData = parseResult.data!;
      const newTask = await db.insertTask({
        nama_tugas: formData.nama,
        mata_kuliah: formData.matkul,
        deadline: formData.deadlineIso,
        catatan: formData.catatan,
      });

      await db.resetSession(sender);

      const catatanLine = newTask.catatan ? `\n📝 ${newTask.catatan}` : '';
      const reply = `Tugas tersimpan ✅\n📌 ${newTask.nama_tugas} — ${newTask.mata_kuliah}\n🗓️ ${formatIndonesianFullDate(newTask.deadline)}${catatanLine}\n\nKami akan ingatkan kamu mulai H-3 sampai hari-H tenggat.`;

      await sendWhatsappMessage({ target: sender, message: reply });
      return reply;
    }

    if (session.status_sesi === 'menunggu_pilih_selesai') {
      const contextMap = session.konteks || {};
      const taskId = contextMap[trimmedText];

      if (!taskId) {
        const reply = 'Nomor tugas tidak valid. Silahkan pilih nomor urut yang ada di daftar.';
        await sendWhatsappMessage({ target: sender, message: reply });
        return reply;
      }

      const completedTask = await db.markTaskCompleted(taskId);
      await db.resetSession(sender);

      const taskName = completedTask ? completedTask.nama_tugas : 'Tugas';
      const reply = `Mantap 🎉 "${taskName}" ditandai selesai.`;

      await sendWhatsappMessage({ target: sender, message: reply });
      return reply;
    }

    if (session.status_sesi === 'menunggu_pilih_hapus') {
      const contextMap = session.konteks || {};
      const taskId = contextMap[trimmedText];

      if (!taskId) {
        const reply = 'Nomor tugas tidak valid. Silahkan pilih nomor urut yang ada di daftar.';
        await sendWhatsappMessage({ target: sender, message: reply });
        return reply;
      }

      const deletedTask = await db.deleteTask(taskId);
      await db.resetSession(sender);

      const taskName = deletedTask ? deletedTask.nama_tugas : 'Tugas';
      const reply = `Tugas "${taskName}" sudah dihapus.`;

      await sendWhatsappMessage({ target: sender, message: reply });
      return reply;
    }
  }

  // 5. Initial Menu Options (when no active session exists)
  if (lowerText === '1') {
    await db.upsertSession({ nomor_wa: sender, status_sesi: 'menunggu_form_tugas', konteks: null });
    await sendWhatsappMessage({ target: sender, message: MESSAGES.FORM_TEMPLATE });
    return MESSAGES.FORM_TEMPLATE;
  }

  if (lowerText === '2') {
    await db.resetSession(sender);
    const tasks = await db.getActiveTasks();
    const reply = formatTaskListMessage(tasks);
    await sendWhatsappMessage({ target: sender, message: reply });
    return reply;
  }

  if (lowerText === '3') {
    const tasks = await db.getActiveTasks();
    if (tasks.length === 0) {
      await db.resetSession(sender);
      await sendWhatsappMessage({ target: sender, message: MESSAGES.EMPTY_LIST });
      return MESSAGES.EMPTY_LIST;
    }

    const contextMap: Record<string, string> = {};
    tasks.forEach((t, i) => {
      contextMap[(i + 1).toString()] = t.id;
    });

    await db.upsertSession({
      nomor_wa: sender,
      status_sesi: 'menunggu_pilih_selesai',
      konteks: contextMap,
    });

    const reply = formatPromptSelectionMessage('Pilih nomor tugas yang mau ditandai selesai:', tasks);
    await sendWhatsappMessage({ target: sender, message: reply });
    return reply;
  }

  if (lowerText === '4') {
    const tasks = await db.getActiveTasks();
    if (tasks.length === 0) {
      await db.resetSession(sender);
      await sendWhatsappMessage({ target: sender, message: MESSAGES.EMPTY_LIST });
      return MESSAGES.EMPTY_LIST;
    }

    const contextMap: Record<string, string> = {};
    tasks.forEach((t, i) => {
      contextMap[(i + 1).toString()] = t.id;
    });

    await db.upsertSession({
      nomor_wa: sender,
      status_sesi: 'menunggu_pilih_hapus',
      konteks: contextMap,
    });

    const reply = formatPromptSelectionMessage('Pilih nomor tugas yang mau dihapus:', tasks);
    await sendWhatsappMessage({ target: sender, message: reply });
    return reply;
  }

  // 6. Default Fallback (unrecognized input without active session)
  await db.resetSession(sender);
  await sendWhatsappMessage({ target: sender, message: MESSAGES.MENU });
  return MESSAGES.MENU;
}

export function formatTaskListMessage(tasks: Task[]): string {
  if (tasks.length === 0) return MESSAGES.EMPTY_LIST;

  const lines = tasks.map((t, index) => {
    const shortDate = formatIndonesianShortDate(t.deadline);
    return `${index + 1}. ${t.nama_tugas} — ${t.mata_kuliah} (${shortDate})`;
  });

  return `Tugas kamu yang belum selesai:\n\n${lines.join('\n')}\n\nKetik "menu" untuk kembali.`;
}

export function formatPromptSelectionMessage(title: string, tasks: Task[]): string {
  const lines = tasks.map((t, index) => {
    const shortDate = formatIndonesianShortDate(t.deadline);
    return `${index + 1}. ${t.nama_tugas} — ${t.mata_kuliah} (${shortDate})`;
  });

  return `${title}\n\n${lines.join('\n')}`;
}
