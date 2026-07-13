# Phase 3 — Task 2: Ticket Management — Create, Read, Update

> **Phase:** 3 — Ticket Management (CRUD + State Machine), Category, Priority/SLA  
> **Estimasi:** Hari ke-3  
> **Prioritas:** 🔴 Critical (core feature)  
> **Referensi PRD:** Bagian 7.4 (FR-TICKET-01 s/d FR-TICKET-06), Bagian 8 (UC-01), Bagian 15.4

---

## Deskripsi

Implementasi endpoint untuk membuat, membaca, dan mengupdate tiket. Termasuk auto-generate nomor tiket, validasi input, dan filtering.

---

## Sub-Tasks

### 2.1 DTO

- [ ] Buat `CreateTicketDto`:
  - `title` — string, wajib, min 5 karakter, max 200 karakter
  - `description` — string, wajib, min 10 karakter
  - `categoryId` — UUID, wajib
  - `priorityId` — UUID, wajib
- [ ] Buat `UpdateTicketDto`:
  - `title` — string, opsional
  - `description` — string, opsional
- [ ] Buat `TicketFilterDto` (extends `PaginationQueryDto`):
  - `status` — TicketStatus enum, opsional (bisa multiple)
  - `priorityId` — UUID, opsional
  - `categoryId` — UUID, opsional
  - `departmentId` — UUID, opsional
  - `createdById` — UUID, opsional
  - `dateFrom` — DateTime, opsional
  - `dateTo` — DateTime, opsional
  - `search` — string, opsional (full-text search pada judul/deskripsi)

### 2.2 Ticket Number Generator

- [ ] Buat service/utility `TicketNumberGenerator`:
  - Format: `TKT-YYYYMMDD-XXXX` (contoh: `TKT-20260710-0001`)
  - XXXX = sequential counter per hari, dimulai dari 0001
  - Gunakan database sequence atau query last ticket number hari ini + 1
  - Handle race condition (gunakan database transaction atau lock)
- [ ] Buat unit test: verifikasi format, verifikasi increment, verifikasi reset harian

### 2.3 Create Ticket — `POST /api/v1/tickets`

- [ ] Role: `@Roles('EMPLOYEE')`
- [ ] Buat `CreateTicketCommand` handler:
  1. Validasi `categoryId` ada dan aktif
  2. Validasi `priorityId` ada
  3. Generate `ticketNumber` (format `TKT-YYYYMMDD-XXXX`)
  4. Set status awal: `OPEN`
  5. Set `createdById` dari `@CurrentUser()`
  6. Simpan tiket ke database
  7. Buat entri `TicketHistory` (fromStatus: null, toStatus: OPEN)
  8. Publish event `ticket.created` ke RabbitMQ:
     ```json
     {
       "eventType": "TicketCreated",
       "ticketId": "...",
       "ticketNumber": "TKT-...",
       "createdById": "...",
       "categoryId": "...",
       "priorityId": "...",
       "departmentId": "...",
       "timestamp": "..."
     }
     ```
  9. Return data tiket yang baru dibuat
- [ ] Error handling:
  - Category/Priority tidak ditemukan → HTTP 400
  - Validasi DTO gagal → HTTP 400

### 2.4 Get Ticket List — `GET /api/v1/tickets`

- [ ] Buat `GetTicketListQuery` handler:
  - **EMPLOYEE**: hanya melihat tiket miliknya (`createdById = currentUser.id`)
  - **TECHNICIAN**: hanya melihat tiket yang di-assign kepadanya
  - **SUPERVISOR & ADMINISTRATOR**: melihat semua tiket
- [ ] Filter berdasarkan `TicketFilterDto`
- [ ] Pagination dengan meta (`page`, `limit`, `total`)
- [ ] Sorting: default `createdAt DESC`
- [ ] Include relasi: `category`, `priority`, `createdBy` (nama saja)
- [ ] Implementasi full-text search pada `title` dan `description` (PostgreSQL `ILIKE` atau `tsvector`)

### 2.5 Get Ticket Detail — `GET /api/v1/tickets/:id`

- [ ] Buat `GetTicketDetailQuery` handler:
  - Ownership check sesuai role (EMPLOYEE hanya miliknya, TECHNICIAN hanya assign-nya)
  - Include relasi lengkap:
    - `category` (nama)
    - `priority` (nama, SLA)
    - `createdBy` (nama, email)
    - `assignments` (active assignment, technician info)
    - `comments` (list, filter isInternal berdasarkan role)
    - `attachments` (list)
    - `history` (list status changes)
    - `rating` (jika sudah ada)
- [ ] Cache di Redis (key: `ticket:{id}`, TTL: 30 detik)
- [ ] Jika tiket tidak ditemukan → HTTP 404
- [ ] Jika user tidak punya akses → HTTP 403

### 2.6 Update Ticket — `PATCH /api/v1/tickets/:id`

- [ ] Role: `@Roles('EMPLOYEE')`
- [ ] Buat `UpdateTicketCommand` handler:
  1. Cari tiket by ID
  2. Validasi ownership (`createdById === currentUser.id`)
  3. Validasi status === `OPEN` (FR-TICKET-03: hanya bisa diubah saat OPEN)
  4. Update field `title` dan/atau `description`
  5. Catat audit log
  6. Invalidasi cache tiket
- [ ] Error handling:
  - Tiket tidak ditemukan → HTTP 404
  - Bukan pemilik → HTTP 403
  - Status bukan OPEN → HTTP 422 "Tiket hanya dapat diubah saat berstatus OPEN"

### 2.7 Cancel Ticket — `PATCH /api/v1/tickets/:id/cancel`

- [ ] Role: `@Roles('EMPLOYEE')`
- [ ] Buat handler:
  1. Validasi ownership
  2. Validasi status === `OPEN` (FR-TICKET-04: hanya bisa batal saat OPEN)
  3. Update status → `CANCELLED` (atau tetap gunakan `REJECTED` dengan catatan cancelled by user)
     > **Catatan**: PRD tidak mendefinisikan status CANCELLED secara eksplisit. Pilih pendekatan: gunakan status REJECTED dengan field tambahan, atau tambah status baru. Diskusikan dengan tim.
  4. Buat entri `TicketHistory`
  5. Catat audit log
  6. Invalidasi cache

---

## Definition of Done

- [ ] Employee bisa membuat tiket baru dengan nomor unik `TKT-YYYYMMDD-XXXX`
- [ ] Event `TicketCreated` ter-publish ke RabbitMQ
- [ ] List tiket mendukung filter, pagination, sorting, search
- [ ] RBAC ownership check bekerja (EMPLOYEE hanya lihat miliknya)
- [ ] Detail tiket menampilkan semua relasi
- [ ] Update tiket hanya bisa saat status OPEN oleh pemilik
- [ ] Cancel tiket hanya bisa saat status OPEN oleh pemilik
- [ ] Semua error return format standar
- [ ] Swagger docs lengkap
- [ ] Unit test: TicketNumberGenerator, CreateTicketCommand, ownership validation
