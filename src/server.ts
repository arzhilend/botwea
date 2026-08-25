import express, { Request, Response, NextFunction } from 'express';
import { config, validateConfig } from './config.js';
import { processIncomingMessage } from './bot.js';
import { runReminderJob } from './scheduler.js';

validateConfig();

const app = express();

// Body parsers for JSON and URL-encoded form data (Fonnte webhook format)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Global error handler for body parser
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err) {
    console.error('[BODY PARSER ERROR]', err.message);
    res.status(200).json({ status: false, error: 'Invalid payload format' });
    return;
  }
  next();
});

app.get(['/', '/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint trigger for daily reminder execution (e.g. from cron-job.org)
app.get(['/api/reminder', '/reminder'], async (_req: Request, res: Response) => {
  try {
    const result = await runReminderJob();
    res.json({ status: true, message: 'Reminder job executed successfully', data: result });
  } catch (error: any) {
    console.error('[REMINDER JOB ERROR]', error);
    res.status(500).json({ status: false, error: error.message || 'Internal error' });
  }
});

async function handleWebhookRequest(req: Request, res: Response): Promise<void> {
  try {
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }

    // 1. Verify Secret Token (if configured)
    if (config.webhookSecret) {
      const incomingSecret = req.headers['x-webhook-secret'] || payload.secret;
      if (incomingSecret !== config.webhookSecret) {
        console.warn('[WEBHOOK SECURITY] Invalid secret token attempt');
        res.status(401).json({ status: false, error: 'Unauthorized' });
        return;
      }
    }

    // 2. Extract Sender & Message content (supports various Fonnte keys)
    const sender = payload.sender || payload.from || payload.target || '';
    const message = payload.message || payload.text || payload.body || '';

    if (!sender || !message) {
      console.warn('[WEBHOOK WARNING] Missing sender or message in payload:', payload);
      res.status(200).json({ status: false, error: 'Missing sender or message' });
      return;
    }

    console.log(`[INCOMING WEBHOOK] From: ${sender} | Message: "${message.replace(/\n/g, ' ')}"`);

    // 3. Process Message via Bot State Machine
    const replyText = await processIncomingMessage(sender, message);

    res.status(200).json({ status: true, message: 'Processed', reply: replyText });
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(500).json({ status: false, error: error.message || 'Internal Server Error' });
  }
}

// Support all possible routes on Vercel
app.post(['/', '/webhook', '/api', '/api/webhook'], handleWebhookRequest);

const PORT = parseInt(config.port, 10) || 3000;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[SERVER] Bot Webhook Receiver running on port ${PORT}`);
  });
}

export default app;
