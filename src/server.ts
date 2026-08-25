import express, { Request, Response } from 'express';
import { config, validateConfig } from './config.js';
import { processIncomingMessage } from './bot.js';

validateConfig();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body || {};

    // 1. Verify Secret Token (if configured)
    if (config.webhookSecret) {
      const incomingSecret = req.headers['x-webhook-secret'] || payload.secret;
      if (incomingSecret !== config.webhookSecret) {
        console.warn('[WEBHOOK SECURITY] Invalid secret token attempt');
        res.status(401).json({ status: false, error: 'Unauthorized' });
        return;
      }
    }

    // 2. Extract Sender & Message content
    const sender = payload.sender || payload.from || '';
    const message = payload.message || payload.text || '';

    if (!sender || !message) {
      res.status(400).json({ status: false, error: 'Invalid payload: missing sender or message' });
      return;
    }

    console.log(`[INCOMING] From: ${sender} | Message: "${message.replace(/\n/g, ' ')}"`);

    // 3. Process Message via Bot State Machine
    const replyText = await processIncomingMessage(sender, message);

    res.json({ status: true, message: 'Processed', reply: replyText });
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(500).json({ status: false, error: 'Internal Server Error' });
  }
});

const PORT = parseInt(config.port, 10) || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SERVER] Bot Webhook Receiver running on port ${PORT}`);
  });
}

export default app;
