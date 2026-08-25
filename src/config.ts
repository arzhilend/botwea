import dotenv from 'dotenv';

dotenv.config();

export const config = {
  get port() {
    return process.env.PORT || '3000';
  },
  get supabaseUrl() {
    return process.env.SUPABASE_URL || '';
  },
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  },
  get fonnteToken() {
    return process.env.FONNTE_TOKEN || '';
  },
  get allowedWaNumber() {
    return process.env.ALLOWED_WA_NUMBER || '';
  },
  set allowedWaNumber(val: string) {
    process.env.ALLOWED_WA_NUMBER = val;
  },
  get webhookSecret() {
    return process.env.WEBHOOK_SECRET || '';
  },
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.warn(`[WARNING] Missing environment variables: ${missing.join(', ')}`);
  }
}
