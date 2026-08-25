import { config } from './config.js';

export interface SendMessageOptions {
  target: string;
  message: string;
}

export async function sendWhatsappMessage(options: SendMessageOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!config.fonnteToken) {
    console.warn(`[FONNTE MOCK/DRY-RUN] To: ${options.target}\nMessage:\n${options.message}`);
    return { success: true, data: { status: true, detail: 'Dry run / missing token' } };
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': config.fonnteToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target: options.target,
        message: options.message,
      }).toString(),
    });

    const resData = await response.json();
    return { success: response.ok, data: resData };
  } catch (err: any) {
    console.error('Error sending WA message via Fonnte:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}
