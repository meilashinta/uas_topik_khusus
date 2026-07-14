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

- [ ] Verifikasi `npm run build` berhasil tanpa error:
  ```bash
  cd app-backend
  npm run build
  ```
- [ ] Verifikasi output di folder `dist/` lengkap
- [ ] Verifikasi `dist/main.js` bisa dijalankan langsung:
  ```bash
  NODE_ENV=production node dist/main.js
  ```
- [ ] Optimasi `tsconfig.build.json`:
  - `removeComments: true`
  - `sourceMap: false` (production)

### 3.2 Frontend Production Build

- [ ] Verifikasi `npm run build` berhasil:
  ```bash
  cd app-frontend
  npm run build
  ```
- [ ] Verifikasi `npm run start` berjalan (production mode)
- [ ] Cek bundle size — optimasi jika terlalu besar
- [ ] Verifikasi environment variable production terisi

### 3.3 PM2 Configuration

- [ ] Buat `ecosystem.config.js` di root project:
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
- [ ] Test PM2 start/stop/restart:
  ```bash
  pm2 start ecosystem.config.js
  pm2 status
  pm2 logs
  pm2 stop all
  ```

### 3.4 Database Migration Production

- [ ] Verifikasi `npx prisma migrate deploy` berhasil di database production/staging
- [ ] Dokumentasikan prosedur rollback migrasi
- [ ] Verifikasi seed data production (jika berbeda dari development)

### 3.5 Health Check Verification

- [ ] Akses `GET /health` → pastikan return status semua dependency (DB, Redis, RabbitMQ)
- [ ] Akses `GET /ready` → pastikan return ready
- [ ] Konfigurasi PM2 untuk restart jika health check gagal (opsional)

### 3.6 Environment Production Checklist

- [ ] Verifikasi semua env variable production terisi:
  - [ ] `DATABASE_URL` → production database
  - [ ] `REDIS_URL` → production Redis
  - [ ] `RABBITMQ_URL` → production RabbitMQ
  - [ ] `JWT_ACCESS_SECRET` → strong random secret
  - [ ] `JWT_REFRESH_SECRET` → strong random secret (berbeda dari access)
  - [ ] `SMTP_*` → production email provider
  - [ ] `FILE_STORAGE_ENDPOINT` → production storage
  - [ ] `FRONTEND_URL` → production frontend URL
  - [ ] `NODE_ENV=production`
- [ ] Verifikasi `.env` production TIDAK ada di Git

### 3.7 Log Configuration Production

- [ ] Verifikasi log level production = `info` (bukan `debug`)
- [ ] Verifikasi stack trace TIDAK tampil di response error production
- [ ] Verifikasi correlation ID ada di setiap log entry
- [ ] Setup PM2 log rotation (opsional):
  ```bash
  pm2 install pm2-logrotate
  ```

---

## Definition of Done

- [ ] Backend build berhasil dan bisa dijalankan via PM2
- [ ] Frontend build berhasil
- [ ] PM2 ecosystem config lengkap (API + 3 worker)
- [ ] Database migration berjalan di production
- [ ] Health check endpoint berfungsi
- [ ] Semua env variable terdokumentasi dan terisi
- [ ] Log production terkonfigurasi dengan benar
