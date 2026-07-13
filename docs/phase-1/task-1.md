# Phase 1 — Task 1: Inisialisasi Project & Boilerplate

> **Phase:** 1 — Dokumentasi, Desain & Setup Awal  
> **Estimasi:** Hari ke-1  
> **Prioritas:** 🔴 Critical (blocking seluruh task lainnya)  
> **Referensi PRD:** Bagian 12.3 (Struktur Modul), Bagian 18 (Deployment)

---

## Deskripsi

Menyiapkan repository, struktur folder, dan boilerplate project untuk backend (NestJS) dan frontend (Next.js) sesuai arsitektur yang didefinisikan di PRD.

---

## Sub-Tasks

### 1.1 Inisialisasi Repository

- [ ] Buat repository Git (jika belum ada)
- [ ] Buat file `.gitignore` untuk Node.js/TypeScript
- [ ] Buat file `README.md` berisi deskripsi singkat project
- [ ] Buat file `LICENSE` (jika diperlukan)

### 1.2 Setup Backend (NestJS)

- [ ] Inisialisasi project NestJS di folder `app-backend/`
  ```bash
  npx -y @nestjs/cli new app-backend --package-manager npm --skip-git
  ```
- [ ] Install dependency utama:
  - `@nestjs/config` — environment variable management
  - `@prisma/client` & `prisma` — ORM
  - `@nestjs/swagger` — auto-generate OpenAPI docs
  - `@nestjs/jwt` & `@nestjs/passport` — autentikasi JWT
  - `passport` & `passport-jwt` — strategy JWT
  - `bcrypt` & `@types/bcrypt` — hashing password
  - `class-validator` & `class-transformer` — validasi DTO
  - `ioredis` — Redis client
  - `amqplib` & `@nestjs/microservices` — RabbitMQ
  - `pino` atau `winston` — structured logging
  - `uuid` — generate UUID
- [ ] Konfigurasi `tsconfig.json` (strict mode, path aliases)
- [ ] Konfigurasi ESLint & Prettier
- [ ] Buat file `.env.example` sesuai Bagian 18.2 PRD

### 1.3 Setup Frontend (Next.js)

- [ ] Inisialisasi project Next.js di folder `app-frontend/`
  ```bash
  npx -y create-next-app@latest app-frontend --typescript --eslint --app --src-dir --no-tailwind
  ```
- [ ] Install dependency utama:
  - `axios` — HTTP client
  - `zustand` atau `@tanstack/react-query` — state management
  - `react-hook-form` & `zod` — form handling & validasi
  - `dayjs` atau `date-fns` — date utility
  - `react-icons` — icon library
  - `chart.js` & `react-chartjs-2` — grafik dashboard
- [ ] Konfigurasi ESLint & Prettier (konsisten dengan backend)

### 1.4 Setup Prisma (Database Schema Awal)

- [ ] Inisialisasi Prisma di `app-backend/`
  ```bash
  npx prisma init
  ```
- [ ] Konfigurasi `datasource` di `schema.prisma` untuk PostgreSQL
- [ ] Pastikan `DATABASE_URL` di `.env` mengarah ke Supabase/Neon

### 1.5 Konfigurasi Environment

- [ ] Buat file `.env.example` dengan seluruh variabel sesuai PRD Bagian 18.2
- [ ] Buat file `.env` lokal (masukkan ke `.gitignore`)
- [ ] Dokumentasikan cara setup Supabase (DB), Upstash (Redis), CloudAMQP (RabbitMQ), Mailtrap (Email) di `SETUP.md`

### 1.6 Struktur Folder Backend

- [ ] Buat struktur folder modular sesuai PRD Bagian 12.3:
  ```
  src/
  ├── modules/
  │   ├── auth/
  │   ├── users/
  │   ├── departments/
  │   ├── categories/
  │   ├── priorities/
  │   ├── tickets/
  │   ├── assignments/
  │   ├── comments/
  │   ├── attachments/
  │   ├── notifications/
  │   ├── dashboard/
  │   ├── reports/
  │   └── audit-log/
  ├── common/
  │   ├── guards/
  │   ├── interceptors/
  │   ├── filters/
  │   ├── decorators/
  │   └── dto/
  ├── config/
  └── main.ts
  ```
- [ ] Buat placeholder module & controller untuk setiap modul

---

## Definition of Done

- [ ] `npm run build` berhasil tanpa error di backend
- [ ] `npm run dev` berhasil berjalan di frontend
- [ ] `npx prisma generate` berhasil
- [ ] ESLint & Prettier berjalan tanpa error
- [ ] Swagger UI dapat diakses di `http://localhost:3000/api`
- [ ] Semua environment variable terdokumentasi di `.env.example`
