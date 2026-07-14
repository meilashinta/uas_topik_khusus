# Phase 7 — Task 4: Demo & Presentasi

> **Phase:** 7 — Dokumentasi Final, Hardening Keamanan, Presentasi  
> **Estimasi:** Hari ke-7  
> **Prioritas:** 🟢 Medium  
> **Referensi PRD:** Bagian 21 (Milestone), Bagian 19 (Success Metrics)

---

## Deskripsi

Persiapan data demo dan skenario presentasi untuk menunjukkan fitur HelpDeskPro secara end-to-end.

---

## Sub-Tasks

### 4.1 Seed Data Demo

- [ ] Buat script `prisma/seed-demo.ts` untuk mengisi data demo yang realistis:
  - **Users** (minimal 1 per role):
    - Admin: `admin@helpdeskpro.id` / `Admin@123`
    - Supervisor: `supervisor@helpdeskpro.id` / `Super@123`
    - Technician 1: `teknisi1@helpdeskpro.id` / `Tech@123`
    - Technician 2: `teknisi2@helpdeskpro.id` / `Tech@123`
    - Employee 1: `karyawan1@helpdeskpro.id` / `User@123`
    - Employee 2: `karyawan2@helpdeskpro.id` / `User@123`
  - **Departments**: IT, HR, Finance, Marketing
  - **Categories**: Hardware, Software, Network, Account Access, Email
  - **Priorities**: CRITICAL, HIGH, MEDIUM, LOW (sudah di-seed)
  - **Tickets**: 20-30 tiket dengan berbagai status:
    - 5 tiket OPEN
    - 3 tiket ASSIGNED
    - 4 tiket IN_PROGRESS (beberapa mendekati SLA)
    - 3 tiket RESOLVED (menunggu verifikasi)
    - 10 tiket CLOSED (dengan rating & feedback)
    - 2 tiket REJECTED
    - 2 tiket OVERDUE
  - **Comments**: beberapa komentar publik dan internal
  - **Ratings**: bervariasi (1-5) untuk tiket closed
  - **Notifications**: beberapa notifikasi unread
- [ ] Tambahkan npm script:
  ```json
  "seed:demo": "ts-node prisma/seed-demo.ts"
  ```

### 4.2 Skenario Demo

- [ ] Siapkan skenario demo berikut (bisa dijalankan live atau screenshot):

#### Demo 1: Alur Tiket Lengkap (5 menit)
  1. Login sebagai Employee
  2. Buat tiket baru: "Laptop tidak bisa nyala setelah update"
  3. Login sebagai Supervisor
  4. Lihat tiket masuk → assign ke Technician 1
  5. Login sebagai Technician
  6. Terima tiket → update status IN_PROGRESS
  7. Tambah komentar internal: "Perlu cek hardware"
  8. Upload bukti → update status RESOLVED
  9. Login sebagai Employee
  10. Lihat notifikasi → verifikasi → approve & beri rating 5/5

#### Demo 2: SLA & Dashboard (3 menit)
  1. Login sebagai Supervisor
  2. Lihat Dashboard: statistik tiket, SLA compliance, technician performance
  3. Tunjukkan tiket overdue
  4. Tunjukkan grafik tren tiket

#### Demo 3: Admin Panel (2 menit)
  1. Login sebagai Admin
  2. User Management: list, create, deactivate
  3. Department Management
  4. Audit Log: lihat aksi yang tercatat

#### Demo 4: Report Export (2 menit)
  1. Login sebagai Supervisor
  2. Generate laporan tiket → download PDF
  3. Generate laporan performa teknisi → download Excel

### 4.3 Verifikasi Success Metrics

- [ ] Checklist Technical Metrics (PRD Bagian 19.1):
  - [ ] Seluruh endpoint berfungsi sesuai spec
  - [ ] RabbitMQ memproses 100% event tanpa stuck di DLQ
  - [ ] Redis cache-hit ratio ≥ 80% (cek via Upstash dashboard)
  - [ ] CQRS memisahkan command dan query secara konsisten
  - [ ] Tidak ada transisi status ilegal yang berhasil
- [ ] Checklist Business Metrics (PRD Bagian 19.2):
  - [ ] Tiket bisa dibuat, ditangani, dan ditutup end-to-end tanpa intervensi DB
  - [ ] Dashboard menampilkan statistik real-time (delay ≤ 60 detik)
  - [ ] Supervisor menerima eskalasi SLA otomatis
  - [ ] SLA Compliance Rate bisa dihitung dan dilaporkan
  - [ ] Rating dan feedback terekap di laporan performa

### 4.4 Screenshot / Recording

- [ ] Ambil screenshot setiap halaman utama:
  - Login page
  - Dashboard (Supervisor view)
  - List tiket
  - Detail tiket
  - Form buat tiket
  - User management
  - Swagger UI
- [ ] (Opsional) Rekam demo video 5-10 menit alur lengkap

---

## Definition of Done

- [ ] Seed data demo ter-install dan realistis
- [ ] Skenario demo bisa dijalankan tanpa error
- [ ] Semua success metrics terverifikasi
- [ ] Screenshot/recording tersedia untuk presentasi
