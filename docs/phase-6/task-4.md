# Phase 6 — Task 4: Integration & E2E Testing

> **Phase:** 6 — Dashboard, Reports, Testing  
> **Estimasi:** Hari ke-6  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 17 (Testing Strategy), Bagian 8 (Use Cases & Acceptance Criteria)

---

## Deskripsi

Menulis integration test (interaksi modul dengan database & Redis) dan E2E test (alur API penuh end-to-end) menggunakan Jest + Supertest.

---

## Sub-Tasks

### 4.1 Setup Integration Test Environment

- [ ] Konfigurasi database test terpisah:
  - Opsi A: Project Supabase/Neon khusus testing
  - Opsi B: Schema terpisah di database yang sama (mis. `test_helpdeskpro`)
- [ ] Konfigurasi Redis test terpisah (Upstash instance khusus testing, atau flush DB sebelum test)
- [ ] Buat script setup test:
  ```bash
  # Reset database test sebelum run
  DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate reset --force
  ```
- [ ] Buat file `.env.test` dengan connection string ke test instances
- [ ] Konfigurasi Jest untuk integration test:
  - Folder: `test/integration/`
  - Setup: seed data sebelum setiap test suite
  - Teardown: cleanup setelah setiap test suite

### 4.2 Integration Test — Auth Module

- [ ] `auth.integration.spec.ts`:
  - [ ] Register → user benar-benar tersimpan di DB
  - [ ] Login → token valid, bisa dipakai untuk akses endpoint protected
  - [ ] Rate limit → counter benar-benar increment di Redis
  - [ ] Refresh token → token lama benar-benar di-blacklist di Redis
  - [ ] Forgot password → token reset tersimpan di Redis

### 4.3 Integration Test — Ticket Module

- [ ] `ticket.integration.spec.ts`:
  - [ ] Create ticket → tersimpan di DB, TicketHistory dibuat
  - [ ] Update ticket → perubahan tersimpan
  - [ ] State transition → status update di DB, history tercatat
  - [ ] Assign → Assignment record tersimpan, status berubah

### 4.4 E2E Test — Alur Lengkap Tiket

- [ ] `ticket-lifecycle.e2e.spec.ts` (mengikuti UC-01 s/d UC-04 PRD):
  ```
  1. Employee register → login → dapat token
  2. Employee buat tiket → tiket OPEN, dapat ticket number
  3. Supervisor login → lihat daftar tiket OPEN
  4. Supervisor assign technician → tiket ASSIGNED
  5. Technician login → lihat tiket assigned-nya
  6. Technician update status → IN_PROGRESS
  7. Technician tambah komentar internal
  8. Technician upload bukti
  9. Technician update status → RESOLVED (dengan catatan)
  10. Employee lihat tiket → status RESOLVED
  11. Employee approve (close) → tiket CLOSED + rating
  12. Verifikasi: TicketHistory memiliki semua transisi
  13. Verifikasi: Rating tersimpan
  ```

### 4.5 E2E Test — Alur Reject

- [ ] `ticket-reject.e2e.spec.ts`:
  ```
  1. Employee buat tiket
  2. Supervisor reject tiket (dengan alasan)
  3. Tiket status REJECTED
  4. Verifikasi: tidak bisa diproses lebih lanjut (semua transisi ditolak)
  ```

### 4.6 E2E Test — Alur Reopen

- [ ] `ticket-reopen.e2e.spec.ts`:
  ```
  1. Employee buat tiket → assign → in_progress → resolved
  2. Employee reject (reopen) → status kembali IN_PROGRESS
  3. Technician resolve lagi
  4. Employee approve → CLOSED
  ```

### 4.7 E2E Test — RBAC Cross-Role Access

- [ ] `rbac.e2e.spec.ts`:
  - [ ] Employee akses endpoint admin (user management) → 403
  - [ ] Technician akses tiket yang bukan assign-nya → 403
  - [ ] Employee akses tiket orang lain → 403
  - [ ] Employee coba assign technician → 403
  - [ ] Technician coba reject tiket → 403

### 4.8 E2E Test — Validasi Input

- [ ] `validation.e2e.spec.ts`:
  - [ ] Register tanpa email → 400
  - [ ] Register password lemah → 400
  - [ ] Buat tiket tanpa judul → 400
  - [ ] Upload file > 10MB → 413
  - [ ] Upload file tipe tidak diizinkan → 400
  - [ ] Transisi status ilegal → 422

---

## Definition of Done

- [ ] Integration test berjalan di database test terpisah
- [ ] E2E test mereproduksi alur lengkap tiket (UC-01 s/d UC-04)
- [ ] E2E test memvalidasi alur reject dan reopen
- [ ] RBAC cross-role access test lulus (semua akses ilegal ditolak)
- [ ] Validasi input test lulus
- [ ] Semua test lulus: `npm run test:e2e`
- [ ] Tidak ada data test yang "bocor" ke database production
