import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || '3000',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  fonnteToken: process.env.FONNTE_TOKEN || '',
  allowedWaNumber: process.env.ALLOWED_WA_NUMBER || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.warn(`[WARNING] Missing environment variables: ${missing.join(', ')}`);
  }
}
