import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { Task, ChatSession } from './types.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error('Supabase credentials missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

export async function getSession(nomorWa: string): Promise<ChatSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sesi_chat')
    .select('*')
    .eq('nomor_wa', nomorWa)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  return data as ChatSession | null;
}

export async function upsertSession(session: Partial<ChatSession> & { nomor_wa: string }): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = {
    ...session,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('sesi_chat').upsert(payload);
  if (error) {
    console.error('Error upserting session:', error);
    throw error;
  }
}

export async function resetSession(nomorWa: string): Promise<void> {
  await upsertSession({
    nomor_wa: nomorWa,
    status_sesi: null,
    konteks: null,
  });
}

export async function insertTask(task: Omit<Task, 'id' | 'created_at' | 'status' | 'reminder_h3_sent' | 'reminder_h2_sent' | 'reminder_h1_sent' | 'reminder_h0_sent'>): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tugas')
    .insert({
      nama_tugas: task.nama_tugas,
      mata_kuliah: task.mata_kuliah,
      deadline: task.deadline,
      catatan: task.catatan || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting task:', error);
    throw error;
  }
  return data as Task;
}

export async function getActiveTasks(): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .eq('status', 'belum')
    .order('deadline', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active tasks:', error);
    throw error;
  }
  return (data || []) as Task[];
}

export async function markTaskCompleted(taskId: string): Promise<Task | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tugas')
    .update({ status: 'selesai' })
    .eq('id', taskId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error completing task:', error);
    throw error;
  }
  return data as Task | null;
}

export async function deleteTask(taskId: string): Promise<Task | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tugas')
    .delete()
    .eq('id', taskId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
  return data as Task | null;
}

export async function getTasksForReminder(todayDateStr: string, maxDateStr: string): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .eq('status', 'belum')
    .gte('deadline', todayDateStr)
    .lte('deadline', maxDateStr);

  if (error) {
    console.error('Error fetching tasks for reminder:', error);
    throw error;
  }
  return (data || []) as Task[];
}

export async function updateTaskReminderFlags(
  taskId: string,
  flags: Partial<Pick<Task, 'reminder_h3_sent' | 'reminder_h2_sent' | 'reminder_h1_sent' | 'reminder_h0_sent'>>
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('tugas')
    .update(flags)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task reminder flags:', error);
    throw error;
  }
}
