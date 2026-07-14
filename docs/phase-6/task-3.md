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

- [ ] Konfigurasi Jest di `app-backend/`:
  - `jest.config.ts` — module mapping, coverage thresholds
  - Coverage threshold: `branches: 70, functions: 70, lines: 70, statements: 70`
- [ ] Buat test helper/utilities:
  - Mock Prisma Service
  - Mock Redis Service
  - Mock RabbitMQ Service (EventPublisher)
  - Mock EmailService
  - Test user factory (generate test user dengan role tertentu)

### 3.2 Auth Module Tests

- [ ] `auth.service.spec.ts`:
  - [ ] Register: sukses, email duplikat (409), password terlalu lemah (400)
  - [ ] Login: sukses, email salah (401), password salah (401), akun non-aktif (403)
  - [ ] Rate limit: 5x gagal → block (429), reset setelah login sukses
  - [ ] Refresh token: sukses, token expired (401), token blacklisted (401), rotation
  - [ ] Logout: token masuk blacklist
  - [ ] Forgot password: email dikirim, email tidak terdaftar (tetap 200)
  - [ ] Reset password: sukses, token expired (400), token sudah dipakai (400)
  - [ ] Change password: sukses, password lama salah, password sama dengan 3 terakhir

### 3.3 Ticket State Machine Tests

- [ ] `ticket-state-machine.service.spec.ts`:
  - [ ] Test SEMUA transisi valid (harus sukses):
    - OPEN → ASSIGNED ✅
    - OPEN → REJECTED ✅
    - ASSIGNED → IN_PROGRESS ✅
    - IN_PROGRESS → RESOLVED ✅
    - IN_PROGRESS → ASSIGNED (reassign) ✅
    - RESOLVED → IN_PROGRESS (reopen) ✅
    - RESOLVED → CLOSED (approve/auto-close) ✅
  - [ ] Test SEMUA transisi ilegal (harus throw 422):
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
  - [ ] Test role validation per transisi

### 3.4 Ticket Management Tests

- [ ] `create-ticket.command.spec.ts`:
  - [ ] Sukses: tiket dibuat, status OPEN, nomor tiket generated
  - [ ] Error: category tidak ada (400), priority tidak ada (400)
  - [ ] Event `ticket.created` di-publish
- [ ] `update-ticket.command.spec.ts`:
  - [ ] Sukses: update title/description saat status OPEN
  - [ ] Error: bukan pemilik (403), status bukan OPEN (422)
- [ ] `ticket-number-generator.spec.ts`:
  - [ ] Format benar: `TKT-YYYYMMDD-XXXX`
  - [ ] Sequential increment
  - [ ] Reset harian

### 3.5 Assignment Tests

- [ ] `assign-technician.command.spec.ts`:
  - [ ] Sukses: assign, status → ASSIGNED, slaDueAt dihitung
  - [ ] Error: status bukan OPEN (422), technician tidak valid (400)
- [ ] `reassign-technician.command.spec.ts`:
  - [ ] Sukses: reassign, old assignment → inactive, alasan tersimpan
  - [ ] Error: alasan kosong (400), technician sama (400)

### 3.6 SLA Service Tests

- [ ] `sla.service.spec.ts`:
  - [ ] `calculateSlaDueAt`: hitung benar per priority
  - [ ] `isOverdue`: true jika waktu terlampaui
  - [ ] `isWarning`: true jika sisa ≤ 20%
  - [ ] SLA checker: warning dikirim sekali, breach ditandai

### 3.7 User Management Tests

- [ ] `create-user.command.spec.ts`: sukses, email duplikat, role invalid
- [ ] `update-user.command.spec.ts`: update field, role change audit
- [ ] `deactivate-user.command.spec.ts`: soft delete, self-deactivation prevented

### 3.8 RBAC Guard Tests

- [ ] `roles.guard.spec.ts`:
  - [ ] EMPLOYEE akses endpoint ADMIN → 403
  - [ ] ADMINISTRATOR akses endpoint ADMIN → pass
  - [ ] Endpoint tanpa `@Roles()` → pass (semua role)
- [ ] `ownership.guard.spec.ts`:
  - [ ] EMPLOYEE akses tiket miliknya → pass
  - [ ] EMPLOYEE akses tiket orang lain → 403

### 3.9 Notification Tests

- [ ] `notification.service.spec.ts`:
  - [ ] Create notification → tersimpan di DB
  - [ ] Mark as read → `isRead = true`
  - [ ] Mark all as read → semua notif user jadi read
  - [ ] Email preference disabled → email tidak dikirim

### 3.10 Rating Tests

- [ ] `submit-rating.command.spec.ts`:
  - [ ] Sukses: rating tersimpan, score 1-5
  - [ ] Error: bukan pemilik (403), status belum RESOLVED (422), duplikat (409)

---

## Definition of Done

- [ ] Seluruh command/query handler memiliki unit test
- [ ] State machine test mencakup SEMUA kombinasi transisi
- [ ] `npm run test` lulus tanpa failure
- [ ] `npm run test:cov` menunjukkan coverage ≥ 70% untuk business logic
- [ ] Tidak ada test yang di-skip atau pending
