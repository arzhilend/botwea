# Bot Catatan Tugas WhatsApp 🤖

Bot WhatsApp personal & multi-user untuk mencatat tugas kuliah, melihat daftar tugas, menandai tugas selesai, dan mengirimkan reminder otomatis (H-3 hingga Hari-H).

## Tech Stack
- **Runtime & Language**: Node.js (TypeScript)
- **Framework**: Express Serverless
- **Database**: PostgreSQL (Supabase)
- **WhatsApp Gateway**: Fonnte API
- **Deployment**: Vercel / Render

## API Endpoints
- `GET /health` : Cek status kesehatan server
- `POST /webhook` : Endpoint receiver pesan WhatsApp dari Fonnte
- `GET /api/reminder` : Endpoint pengiriman reminder harian otomatis (bisa dipicu dari cron-job.org)

## Environment Variables
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
FONNTE_TOKEN=your-fonnte-token
ALLOWED_WA_NUMBER=
```
