# Setup Lingkungan Development HelpDeskPro

HelpDeskPro menggunakan arsitektur modern berbasis kontainer. Untuk menyederhanakan proses development, kita menggunakan **Docker & Docker Compose** untuk menjalankan seluruh layanan pendukung (PostgreSQL, Redis, RabbitMQ) secara lokal.

## Persyaratan
- [Node.js](https://nodejs.org/en/) (versi 18 atau ke atas)
- [Docker & Docker Compose](https://www.docker.com/)
- (Opsional) Akun Supabase, Upstash, dan CloudAMQP jika tidak ingin memakai Docker secara lokal.

## 1. Menjalankan Layanan Infrastruktur (Direkomendasikan via Docker)

Sangat disarankan menjalankan PostgreSQL, Redis, dan RabbitMQ menggunakan Docker lokal agar sesuai dengan konfigurasi standar yang ada di `docker-compose.yml`.

Jalankan perintah ini di *root repository*:
```bash
docker-compose up -d
```

Ini akan menjalankan:
- PostgreSQL di `localhost:5433`
- Redis di `localhost:6379`
- RabbitMQ di `localhost:5672` (dan manajemen UI di `localhost:15672` login `guest:guest`)

### (Alternatif) Layanan Cloud
Jika mesin Anda tidak sanggup menjalankan Docker:
- **Supabase**: Buat project baru, salin URL koneksi (Transaction mode / Port 5432).
- **Upstash**: Buat database Redis, salin URL `rediss://...`.
- **CloudAMQP**: Buat instance RabbitMQ gratis, salin URL `amqps://...`.

## 2. Mengisi Environment Variables (`.env`)

Duplikat file konfigurasi *environment* untuk bagian `app-backend`:
```bash
cp app-backend/.env.example app-backend/.env
```

Pastikan variabel berikut mengarah ke koneksi lokal Anda (jika pakai Docker):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/helpdesk?schema=public"
REDIS_URL="redis://localhost:6379"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
```

## 3. Menyiapkan Database Backend

Masuk ke folder backend, instal dependency, dan inisiasi database:
```bash
cd app-backend
npm install
npx prisma migrate dev
npx prisma db seed
```
Perintah `seed` akan membuat akun Administrator bawaan:
- **Email:** admin@helpdesk.com
- **Password:** password123

## 4. Menjalankan Aplikasi

- **Backend (API):**
  ```bash
  cd app-backend
  npm run start:dev
  ```
  Swagger API Docs dapat diakses di `http://localhost:3000/api/docs`.

- **Frontend (Web):** *(Akan datang di fase selanjutnya)*
  ```bash
  cd app-frontend
  npm install
  npm run dev
  ```
