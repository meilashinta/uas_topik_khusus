# Phase 1 — Task 5: Dokumentasi Arsitektur & OpenAPI Draft

> **Phase:** 1 — Dokumentasi, Desain & Setup Awal  
> **Estimasi:** Hari ke-1  
> **Prioritas:** 🟢 Medium  
> **Referensi PRD:** Bagian 12 (Architecture), Bagian 15 (API Spec), Dokumen Control

---

## Deskripsi

Membuat dokumentasi arsitektur teknis dan draft spesifikasi OpenAPI yang menjadi panduan pengembangan seluruh tim/agent.

---

## Sub-Tasks

### 5.1 Dokumen Arsitektur

- [ ] Buat file `docs/architecture.md` berisi:
  - Diagram arsitektur high-level (Client → Frontend → Backend → DB/Redis/RabbitMQ)
  - Penjelasan pola CQRS yang digunakan (lightweight, bukan full Event Sourcing)
  - Penjelasan event-driven flow via RabbitMQ
  - Penjelasan caching strategy (cache-aside pattern)
  - Diagram modul NestJS (sesuai PRD Bagian 12.3)

### 5.2 Setup Swagger/OpenAPI di NestJS

- [ ] Konfigurasi `SwaggerModule` di `main.ts`:
  - Title: "HelpDeskPro API"
  - Version: "1.0"
  - Description: dari PRD Bagian 1
  - Bearer Auth scheme (JWT)
  - Tag per modul (Auth, Users, Departments, Categories, Priorities, Tickets, Assignments, Comments, Attachments, Notifications, Dashboard, Reports, Ratings)
- [ ] Pastikan Swagger UI bisa diakses di `/api/docs`
- [ ] Export `openapi.json` / `openapi.yaml` otomatis

### 5.3 Dokumentasi API Standard

- [ ] Dokumentasikan standar response format di `docs/api-standards.md`:
  - Format sukses & error (sesuai PRD 15.10)
  - Konvensi HTTP status code
  - Konvensi naming endpoint (kebab-case, RESTful)
  - Pagination standard (query params: `page`, `limit`, `sortBy`, `sortOrder`)
  - Filter standard (query params per modul)

### 5.4 Dokumentasi Setup Development

- [ ] Buat/update file `SETUP.md` di root project:
  - Langkah daftar akun Supabase (PostgreSQL)
  - Langkah daftar akun Upstash (Redis)
  - Langkah daftar akun CloudAMQP (RabbitMQ)
  - Langkah daftar akun Mailtrap (Email Testing)
  - Cara mengisi `.env` dari masing-masing service
  - Cara menjalankan backend, frontend, dan worker

---

## Definition of Done

- [ ] `docs/architecture.md` lengkap dengan diagram
- [ ] Swagger UI menampilkan semua tag modul di `/api/docs`
- [ ] `docs/api-standards.md` lengkap
- [ ] `SETUP.md` cukup jelas untuk developer baru memulai tanpa bantuan tambahan
