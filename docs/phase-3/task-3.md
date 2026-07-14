# Phase 3 — Task 3: Ticket State Machine & Status Transitions

> **Phase:** 3 — Ticket Management (CRUD + State Machine), Category, Priority/SLA  
> **Estimasi:** Hari ke-3  
> **Prioritas:** 🔴 Critical (core business logic)  
> **Referensi PRD:** Bagian 9 (Ticket Workflow / State Machine), Bagian 9.1 (Matriks Transisi), Bagian 7.7 (FR-CLOSE), Bagian 7.8 (FR-REJECT)

---

## Deskripsi

Implementasi state machine tiket yang memvalidasi setiap transisi status. Ini adalah inti logika bisnis HelpDeskPro — transisi ilegal WAJIB ditolak.

---

## Sub-Tasks

### 3.1 State Machine Service

- [x] Buat `TicketStateMachineService` yang mendefinisikan transisi sah:
  ```typescript
  const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    OPEN: [ASSIGNED, REJECTED],
    ASSIGNED: [IN_PROGRESS],
    IN_PROGRESS: [RESOLVED, ASSIGNED], // ASSIGNED = reassign
    RESOLVED: [IN_PROGRESS, CLOSED],   // IN_PROGRESS = reopen
    CLOSED: [],                         // final state
    REJECTED: [],                       // final state
  };
  ```
- [x] Buat method `canTransition(from: TicketStatus, to: TicketStatus): boolean`
- [x] Buat method `validateTransition(from, to): void` — throw `UnprocessableEntityException` (HTTP 422) jika transisi ilegal
- [x] Buat method `getValidNextStatuses(from: TicketStatus): TicketStatus[]`
- [x] Buat unit test yang menguji SEMUA kombinasi dari matriks transisi PRD Bagian 9.1:
  - Test setiap transisi valid (harus sukses)
  - Test setiap transisi ilegal (harus throw 422)

### 3.2 Role Validation per Transisi

- [x] Tambahkan validasi siapa yang boleh melakukan setiap transisi:
  | Transisi | Role yang Diizinkan |
  |---|---|
  | OPEN → ASSIGNED | Supervisor, Administrator |
  | OPEN → REJECTED | Supervisor, Administrator |
  | ASSIGNED → IN_PROGRESS | Technician (yang di-assign) |
  | IN_PROGRESS → RESOLVED | Technician (yang di-assign) |
  | IN_PROGRESS → ASSIGNED | Supervisor (reassign) |
  | RESOLVED → IN_PROGRESS | Employee (pemilik tiket, reopen) |
  | RESOLVED → CLOSED | Employee (pemilik, approve) atau System (auto-close) |
- [x] Buat method `validateTransitionRole(from, to, userRole, userId, ticket)` yang memvalidasi role DAN ownership/assignment

### 3.3 Reject Ticket — `PATCH /api/v1/tickets/:id/reject`

- [x] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [x] Buat DTO `RejectTicketDto`:
  - `reason` — string, wajib, min 10 karakter
- [x] Buat `RejectTicketCommand` handler:
  1. Cari tiket by ID
  2. Validasi transisi: status HARUS `OPEN` → `REJECTED`
  3. Update status ke `REJECTED`
  4. Simpan reason di `TicketHistory.note`
  5. Publish event `ticket.rejected`
  6. Invalidasi cache
- [x] FR-REJECT-02: Tiket REJECTED tidak bisa diproses lebih lanjut

### 3.4 Close Ticket (Employee Approve) — `PATCH /api/v1/tickets/:id/close`

- [x] Role: `@Roles('EMPLOYEE')`
- [x] Buat DTO `CloseTicketDto`:
  - `rating` — int, wajib, 1-5
  - `feedback` — string, opsional
- [x] Buat `CloseTicketCommand` handler:
  1. Cari tiket by ID
  2. Validasi ownership (`createdById === currentUser.id`)
  3. Validasi transisi: status HARUS `RESOLVED` → `CLOSED`
  4. Update status ke `CLOSED`, set `closedAt`
  5. Simpan Rating (score + feedback)
  6. Buat entri TicketHistory
  7. Publish event `ticket.closed`
  8. Invalidasi cache

### 3.5 Reopen Ticket (Employee Reject) — `PATCH /api/v1/tickets/:id/reopen`

- [x] Role: `@Roles('EMPLOYEE')`
- [x] Buat DTO `ReopenTicketDto`:
  - `reason` — string, wajib (alasan penolakan)
- [x] Buat handler:
  1. Validasi ownership
  2. Validasi transisi: `RESOLVED` → `IN_PROGRESS`
  3. Update status ke `IN_PROGRESS`
  4. Simpan reason di TicketHistory
  5. Publish event `ticket.status_changed` (dengan info reopen)
  6. Kirim notifikasi ke Technician yang di-assign

### 3.6 Generic Status Update — `PATCH /api/v1/tickets/:id/status`

- [x] Buat DTO `UpdateStatusDto`:
  - `status` — TicketStatus, wajib
  - `note` — string, opsional
- [x] Buat `UpdateTicketStatusCommand` handler:
  1. Cari tiket
  2. Panggil `TicketStateMachineService.validateTransition(currentStatus, newStatus)`
  3. Panggil `validateTransitionRole(...)` untuk cek role & ownership
  4. Jika transisi ke `RESOLVED`:
     - Validasi wajib ada catatan penyelesaian (FR-PROGRESS-02)
     - Set `resolvedAt`
  5. Update status
  6. Buat entri TicketHistory
  7. Publish event yang sesuai
  8. Invalidasi cache

### 3.7 Get Ticket History — `GET /api/v1/tickets/:id/history`

- [x] Auth required
- [x] Return list semua TicketHistory untuk tiket tertentu
- [x] Ordered by `createdAt ASC`
- [x] Include: `changedBy` (nama user), `fromStatus`, `toStatus`, `note`, `createdAt`

---

## Definition of Done

- [x] State machine MENOLAK semua transisi ilegal dengan HTTP 422
- [x] State machine MENGIZINKAN semua transisi valid
- [x] Role + ownership validation benar di setiap transisi
- [x] Reject ticket menyimpan alasan dan tiket menjadi final state
- [x] Close ticket menyimpan rating
- [x] Reopen ticket mengembalikan status ke IN_PROGRESS
- [x] Setiap transisi mencatat TicketHistory
- [x] Setiap transisi publish event ke RabbitMQ
- [x] **Unit test WAJIB mencakup seluruh kombinasi matriks transisi (36 kombinasi)**
- [x] Swagger docs lengkap dengan error response 422
