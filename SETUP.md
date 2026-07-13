# Setup HelpDeskPro

## Prerequisites
1. **Node.js**: v18 atau yang lebih baru
2. **Git**: Untuk version control

## Cloud Services Setup

### 1. Database (Supabase)
- Buat akun di [Supabase](https://supabase.com/).
- Buat project baru.
- Buka Project Settings -> Database.
- Salin `Connection string` (URI) dan masukkan ke `DATABASE_URL` di `.env`.

### 2. Cache (Upstash Redis)
- Buat akun di [Upstash](https://upstash.com/).
- Buat Redis Database baru.
- Salin `UPSTASH_REDIS_REST_URL` atau URI Redis dan masukkan ke `REDIS_URL` di `.env`.

### 3. Message Broker (CloudAMQP)
- Buat akun di [CloudAMQP](https://www.cloudamqp.com/).
- Buat instance baru (pilih free tier "Little Lemur").
- Salin `AMQP URL` dan masukkan ke `RABBITMQ_URL` di `.env`.

### 4. Email (Mailtrap)
- Buat akun di [Mailtrap](https://mailtrap.io/).
- Masuk ke Inboxes, lalu pilih SMTP settings.
- Salin credentials ke `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, dan `SMTP_PASS` di `.env`.

## Menjalankan Aplikasi
Lihat dokumentasi `README.md` dan PRD bagian 18.3 untuk petunjuk instalasi dan cara menjalankan backend serta frontend.
