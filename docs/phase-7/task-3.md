# Phase 7 — Task 3: Production Build & Deployment Setup

> **Phase:** 7 — Dokumentasi Final, Hardening Keamanan, Presentasi  
> **Estimasi:** Hari ke-7  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 18 (Deployment & DevOps)

---

## Deskripsi

Mempersiapkan project untuk production deployment: build optimization, PM2 configuration, dan verifikasi production readiness.

---

## Sub-Tasks

### 3.1 Backend Production Build

- [x] Verifikasi `npm run build` berhasil tanpa error:
  ```bash
  cd app-backend
  npm run build
  ```
- [x] Verifikasi output di folder `dist/` lengkap
- [x] Verifikasi `dist/main.js` bisa dijalankan langsung:
  ```bash
  NODE_ENV=production node dist/main.js
  ```
- [x] Optimasi `tsconfig.build.json`:
  - `removeComments: true`
  - `sourceMap: false` (production)

### 3.2 Frontend Production Build

- [x] Verifikasi `npm run build` berhasil:
  ```bash
  cd app-frontend
  npm run build
  ```
- [x] Verifikasi `npm run start` berjalan (production mode)
- [x] Cek bundle size — optimasi jika terlalu besar
- [x] Verifikasi environment variable production terisi

### 3.3 PM2 Configuration

- [x] Buat `ecosystem.config.js` di root project:
  ```javascript
  module.exports = {
    apps: [
      {
        name: 'helpdeskpro-api',
        script: 'dist/main.js',
        cwd: './app-backend',
        instances: 2,
        exec_mode: 'cluster',
        env: { NODE_ENV: 'production' },
        max_memory_restart: '500M',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      },
      {
        name: 'worker-notification',
        script: 'dist/workers/notification.worker.js',
        cwd: './app-backend',
        instances: 1,
        env: { NODE_ENV: 'production' },
      },
      {
        name: 'worker-activity',
        script: 'dist/workers/activity.worker.js',
        cwd: './app-backend',
        instances: 1,
        env: { NODE_ENV: 'production' },
      },
      {
        name: 'worker-analytics',
        script: 'dist/workers/analytics.worker.js',
        cwd: './app-backend',
        instances: 1,
        env: { NODE_ENV: 'production' },
      },
    ],
  };
  ```
- [x] Test PM2 start/stop/restart:
  ```bash
  pm2 start ecosystem.config.js
  pm2 status
  pm2 logs
  pm2 stop all
  ```

### 3.4 Database Migration Production

- [x] Verifikasi `npx prisma migrate deploy` berhasil di database production/staging
- [x] Dokumentasikan prosedur rollback migrasi
- [x] Verifikasi seed data production (jika berbeda dari development)

### 3.5 Health Check Verification

- [x] Akses `GET /health` → pastikan return status semua dependency (DB, Redis, RabbitMQ)
- [x] Akses `GET /ready` → pastikan return ready
- [x] Konfigurasi PM2 untuk restart jika health check gagal (opsional)

### 3.6 Environment Production Checklist

- [x] Verifikasi semua env variable production terisi:
  - [x] `DATABASE_URL` → production database
  - [x] `REDIS_URL` → production Redis
  - [x] `RABBITMQ_URL` → production RabbitMQ
  - [x] `JWT_ACCESS_SECRET` → strong random secret
  - [x] `JWT_REFRESH_SECRET` → strong random secret (berbeda dari access)
  - [x] `SMTP_*` → production email provider
  - [x] `FILE_STORAGE_ENDPOINT` → production storage
  - [x] `FRONTEND_URL` → production frontend URL
  - [x] `NODE_ENV=production`
- [x] Verifikasi `.env` production TIDAK ada di Git

### 3.7 Log Configuration Production

- [x] Verifikasi log level production = `info` (bukan `debug`)
- [x] Verifikasi stack trace TIDAK tampil di response error production
- [x] Verifikasi correlation ID ada di setiap log entry
- [x] Setup PM2 log rotation (opsional):
  ```bash
  pm2 install pm2-logrotate
  ```

---

## Definition of Done

- [x] Backend build berhasil dan bisa dijalankan via PM2
- [x] Frontend build berhasil
- [x] PM2 ecosystem config lengkap (API + 3 worker)
- [x] Database migration berjalan di production
- [x] Health check endpoint berfungsi
- [x] Semua env variable terdokumentasi dan terisi
- [x] Log production terkonfigurasi dengan benar
