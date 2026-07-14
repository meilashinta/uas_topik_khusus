# Phase 6 — Task 3: Unit Testing — Business Logic

> **Phase:** 6 — Dashboard, Reports, Testing  
> **Estimasi:** Hari ke-6  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 17 (Testing Strategy), target coverage ≥ 70%

---

## Deskripsi

Menulis unit test untuk seluruh business logic (command/query handler) menggunakan Jest. Target minimum: code coverage ≥ 70% untuk business logic.

---

## Sub-Tasks

### 3.1 Setup Testing

- [x] Konfigurasi Jest di `app-backend/`:
  - `jest.config.ts` — module mapping, coverage thresholds
  - Coverage threshold: `branches: 70, functions: 70, lines: 70, statements: 70`
- [x] Buat test helper/utilities:
  - Mock Prisma Service
  - Mock Redis Service
  - Mock RabbitMQ Service (EventPublisher)
  - Mock EmailService
  - Test user factory (generate test user dengan role tertentu)

### 3.2 Auth Module Tests

- [x] `auth.service.spec.ts`:
  - [x] Register: sukses, email duplikat (409), password terlalu lemah (400)
  - [x] Login: sukses, email salah (401), password salah (401), akun non-aktif (403)
  - [x] Rate limit: 5x gagal → block (429), reset setelah login sukses
  - [x] Refresh token: sukses, token expired (401), token blacklisted (401), rotation
  - [x] Logout: token masuk blacklist
  - [x] Forgot password: email dikirim, email tidak terdaftar (tetap 200)
  - [x] Reset password: sukses, token expired (400), token sudah dipakai (400)
  - [x] Change password: sukses, password lama salah, password sama dengan 3 terakhir

### 3.3 Ticket State Machine Tests

- [x] `ticket-state-machine.service.spec.ts`:
  - [x] Test SEMUA transisi valid (harus sukses):
    - OPEN → ASSIGNED ✅
    - OPEN → REJECTED ✅
    - ASSIGNED → IN_PROGRESS ✅
    - IN_PROGRESS → RESOLVED ✅
    - IN_PROGRESS → ASSIGNED (reassign) ✅
    - RESOLVED → IN_PROGRESS (reopen) ✅
    - RESOLVED → CLOSED (approve/auto-close) ✅
  - [x] Test SEMUA transisi ilegal (harus throw 422):
    - OPEN → IN_PROGRESS ❌
    - OPEN → RESOLVED ❌
    - OPEN → CLOSED ❌
    - ASSIGNED → OPEN ❌
    - ASSIGNED → RESOLVED ❌
    - ASSIGNED → CLOSED ❌
    - ASSIGNED → REJECTED ❌
    - IN_PROGRESS → OPEN ❌
    - IN_PROGRESS → CLOSED ❌
    - IN_PROGRESS → REJECTED ❌
    - RESOLVED → OPEN ❌
    - RESOLVED → ASSIGNED ❌
    - RESOLVED → REJECTED ❌
    - CLOSED → (apapun) ❌
    - REJECTED → (apapun) ❌
  - [x] Test role validation per transisi

### 3.4 Ticket Management Tests

- [x] `create-ticket.command.spec.ts`:
  - [x] Sukses: tiket dibuat, status OPEN, nomor tiket generated
  - [x] Error: category tidak ada (400), priority tidak ada (400)
  - [x] Event `ticket.created` di-publish
- [x] `update-ticket.command.spec.ts`:
  - [x] Sukses: update title/description saat status OPEN
  - [x] Error: bukan pemilik (403), status bukan OPEN (422)
- [x] `ticket-number-generator.spec.ts`:
  - [x] Format benar: `TKT-YYYYMMDD-XXXX`
  - [x] Sequential increment
  - [x] Reset harian

### 3.5 Assignment Tests

- [x] `assign-technician.command.spec.ts`:
  - [x] Sukses: assign, status → ASSIGNED, slaDueAt dihitung
  - [x] Error: status bukan OPEN (422), technician tidak valid (400)
- [x] `reassign-technician.command.spec.ts`:
  - [x] Sukses: reassign, old assignment → inactive, alasan tersimpan
  - [x] Error: alasan kosong (400), technician sama (400)

### 3.6 SLA Service Tests

- [x] `sla.service.spec.ts`:
  - [x] `calculateSlaDueAt`: hitung benar per priority
  - [x] `isOverdue`: true jika waktu terlampaui
  - [x] `isWarning`: true jika sisa ≤ 20%
  - [x] SLA checker: warning dikirim sekali, breach ditandai

### 3.7 User Management Tests

- [x] `create-user.command.spec.ts`: sukses, email duplikat, role invalid
- [x] `update-user.command.spec.ts`: update field, role change audit
- [x] `deactivate-user.command.spec.ts`: soft delete, self-deactivation prevented

### 3.8 RBAC Guard Tests

- [x] `roles.guard.spec.ts`:
  - [x] EMPLOYEE akses endpoint ADMIN → 403
  - [x] ADMINISTRATOR akses endpoint ADMIN → pass
  - [x] Endpoint tanpa `@Roles()` → pass (semua role)
- [x] `ownership.guard.spec.ts`:
  - [x] EMPLOYEE akses tiket miliknya → pass
  - [x] EMPLOYEE akses tiket orang lain → 403

### 3.9 Notification Tests

- [x] `notification.service.spec.ts`:
  - [x] Create notification → tersimpan di DB
  - [x] Mark as read → `isRead = true`
  - [x] Mark all as read → semua notif user jadi read
  - [x] Email preference disabled → email tidak dikirim

### 3.10 Rating Tests

- [x] `submit-rating.command.spec.ts`:
  - [x] Sukses: rating tersimpan, score 1-5
  - [x] Error: bukan pemilik (403), status belum RESOLVED (422), duplikat (409)

---

## Definition of Done

- [x] Seluruh command/query handler memiliki unit test
- [x] State machine test mencakup SEMUA kombinasi transisi
- [x] `npm run test` lulus tanpa failure
- [x] `npm run test:cov` menunjukkan coverage ≥ 70% untuk business logic
- [x] Tidak ada test yang di-skip atau pending
