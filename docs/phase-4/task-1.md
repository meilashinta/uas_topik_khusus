# Phase 4 — Task 1: Modul Assignment Management

> **Phase:** 4 — Assignment, Comment, Attachment, Notification  
> **Estimasi:** Hari ke-4  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 7.5 (FR-ASSIGN), Bagian 8 (UC-02), Bagian 15.5

---

## Deskripsi

Implementasi assign dan reassign teknisi ke tiket oleh Supervisor, termasuk tracking beban kerja teknisi.

---

## Sub-Tasks

### 1.1 DTO

- [ ] Buat `AssignTechnicianDto`:
  - `technicianId` — UUID, wajib
- [ ] Buat `ReassignTechnicianDto`:
  - `technicianId` — UUID, wajib (teknisi baru)
  - `reason` — string, wajib (FR-ASSIGN-02: alasan reassign wajib diisi)

### 1.2 Assign Technician — `POST /api/v1/tickets/:id/assign`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Buat `AssignTechnicianCommand` handler:
  1. Cari tiket by ID
  2. Validasi status tiket HARUS `OPEN`
  3. Validasi `technicianId` ada, aktif, dan memiliki role `TECHNICIAN`
  4. Buat entri `Assignment` baru (`isActive = true`)
  5. Update tiket status dari `OPEN` → `ASSIGNED`
  6. Hitung `slaDueAt` berdasarkan priority SLA:
     ```typescript
     slaDueAt = now + priority.slaResolutionMinutes
     ```
  7. Buat entri `TicketHistory` (OPEN → ASSIGNED)
  8. Publish event `ticket.assigned`:
     ```json
     {
       "eventType": "TicketAssigned",
       "ticketId": "...",
       "ticketNumber": "...",
       "assignedTo": "uuid-technician",
       "assignedBy": "uuid-supervisor",
       "priority": "HIGH",
       "slaDueAt": "2026-07-10T18:00:00Z",
       "timestamp": "..."
     }
     ```
  9. Invalidasi cache tiket
- [ ] Error handling:
  - Tiket tidak ditemukan → HTTP 404
  - Status bukan OPEN → HTTP 422
  - Technician tidak valid → HTTP 400

### 1.3 Reassign Technician — `POST /api/v1/tickets/:id/reassign`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Buat `ReassignTechnicianCommand` handler:
  1. Cari tiket by ID
  2. Validasi status: `ASSIGNED` atau `IN_PROGRESS` (FR-ASSIGN-02: sebelum RESOLVED)
  3. Validasi technician baru berbeda dari technician saat ini
  4. Validasi technician baru valid (aktif, role TECHNICIAN)
  5. Set assignment lama `isActive = false`
  6. Buat assignment baru (`isActive = true`) dengan `reason`
  7. Update status tiket → `ASSIGNED` (kembali ke ASSIGNED jika sedang IN_PROGRESS)
  8. Buat entri TicketHistory dengan catatan reassign
  9. Publish event `ticket.assigned` (dengan info reassign)
  10. Invalidasi cache

### 1.4 Get Technician Workload

- [ ] Buat query `GET /api/v1/technicians/workload` (atau embed di list technicians):
  - Return list semua technician dengan:
    - Jumlah tiket aktif (status: ASSIGNED, IN_PROGRESS) — FR-ASSIGN-03
    - Jumlah tiket resolved hari ini
    - Rata-rata rating (opsional)
  - Digunakan oleh Supervisor saat memilih teknisi di form assign
- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`

### 1.5 Get Assignment History per Ticket

- [ ] Buat query handler untuk menampilkan riwayat assignment tiket
- [ ] Include: technician name, assigned by, assigned at, reason, isActive
- [ ] Bisa diakses via `GET /api/v1/tickets/:id` (sudah ada di detail tiket)

---

## Definition of Done

- [ ] Supervisor bisa assign technician ke tiket OPEN
- [ ] Status tiket berubah ke ASSIGNED setelah assign
- [ ] SLA `slaDueAt` dihitung otomatis
- [ ] Supervisor bisa reassign dengan alasan wajib
- [ ] Reassign membuat assignment lama non-aktif
- [ ] Beban kerja teknisi bisa dilihat (jumlah tiket aktif)
- [ ] Event `ticket.assigned` ter-publish
- [ ] Swagger docs lengkap
- [ ] Unit test: assign flow, reassign flow, workload query
