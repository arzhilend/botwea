import { config, validateConfig } from './config.js';
import * as db from './db.js';
import { sendWhatsappMessage } from './fonnte.js';
import { formatIndonesianFullDate } from './parser.js';
import { Task } from './types.js';

export function calculateDiffDays(todayStr: string, deadlineStr: string): number {
  const t = new Date(todayStr + 'T00:00:00Z');
  const d = new Date(deadlineStr + 'T00:00:00Z');
  const diffMs = d.getTime() - t.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatReminderMessage(task: Task, labelH: string): string {
  const fullDate = formatIndonesianFullDate(task.deadline);
  const catatanLine = task.catatan ? `\n📝 ${task.catatan}` : '';

  return `⏰ Reminder tugas\n\n📌 ${task.nama_tugas} — ${task.mata_kuliah}\n🗓️ Deadline: ${fullDate} (${labelH})${catatanLine}`;
}

export async function runReminderJob(targetWaNumber?: string): Promise<{ processed: number; sent: number }> {
  validateConfig();

  const recipient = targetWaNumber || config.allowedWaNumber;
  if (!recipient) {
    console.error('[SCHEDULER ERROR] No target WhatsApp number specified or configured in ALLOWED_WA_NUMBER.');
    return { processed: 0, sent: 0 };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  console.log(`[SCHEDULER] Running reminder job for range ${todayStr} to ${maxDateStr}`);

  const tasks = await db.getTasksForReminder(todayStr, maxDateStr);
  let sentCount = 0;

  for (const task of tasks) {
    const diffDays = calculateDiffDays(todayStr, task.deadline);

    let shouldSend = false;
    let labelH = '';
    let flagToUpdate: Partial<Pick<Task, 'reminder_h3_sent' | 'reminder_h2_sent' | 'reminder_h1_sent' | 'reminder_h0_sent'>> = {};

    if (diffDays === 3 && !task.reminder_h3_sent) {
      shouldSend = true;
      labelH = 'H-3';
      flagToUpdate = { reminder_h3_sent: true };
    } else if (diffDays === 2 && !task.reminder_h2_sent) {
      shouldSend = true;
      labelH = 'H-2';
      flagToUpdate = { reminder_h2_sent: true };
    } else if (diffDays === 1 && !task.reminder_h1_sent) {
      shouldSend = true;
      labelH = 'H-1';
      flagToUpdate = { reminder_h1_sent: true };
    } else if (diffDays === 0 && !task.reminder_h0_sent) {
      shouldSend = true;
      labelH = 'H';
      flagToUpdate = { reminder_h0_sent: true };
    }

    if (shouldSend) {
      const message = formatReminderMessage(task, labelH);
      console.log(`[SCHEDULER] Sending reminder for task "${task.nama_tugas}" (${labelH}) to ${recipient}`);

      const res = await sendWhatsappMessage({ target: recipient, message });
      if (res.success) {
        await db.updateTaskReminderFlags(task.id, flagToUpdate);
        sentCount++;
      } else {
        console.error(`[SCHEDULER ERROR] Failed sending reminder for task "${task.nama_tugas}":`, res.error);
      }
    }
  }

  console.log(`[SCHEDULER] Finished. Processed ${tasks.length} task(s), sent ${sentCount} reminder(s).`);
  return { processed: tasks.length, sent: sentCount };
}

// Execute directly if run via CLI `npm run reminder`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scheduler.ts')) {
  runReminderJob()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SCHEDULER CRASH]', err);
      process.exit(1);
    });
}
