# Phase 5 — Task 1: Audit Log Module (Activity Worker)

> **Phase:** 5 — Integrasi CQRS Penuh, RabbitMQ (Event + Worker), Redis Caching  
> **Estimasi:** Hari ke-5  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 10.2 (ActivityLog), Bagian 13.3 (Activity Worker), Bagian 16.2 (Security)

---

## Deskripsi

Implementasi modul Audit Log (Activity Trail) yang mencatat seluruh aksi sensitif di sistem, serta Activity Worker yang menulis log dari event RabbitMQ.

---

## Sub-Tasks

### 1.1 Audit Log Service

- [ ] Buat `AuditLogService` dengan method:
  - `log(params: CreateAuditLogDto): Promise<ActivityLog>`
  - `findAll(filters: AuditLogFilterDto): Promise<PaginatedResult<ActivityLog>>`
  - `findByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>`
- [ ] Buat DTO `CreateAuditLogDto`:
  - `userId` — UUID, nullable (null untuk aksi sistem)
  - `action` — string (mis. `TICKET_CREATED`, `USER_ROLE_CHANGED`)
  - `entityType` — string (mis. `Ticket`, `User`, `Department`)
  - `entityId` — UUID
  - `metadata` — object (payload before/after)
  - `ipAddress` — string

### 1.2 Audit Log API Endpoints

#### 1.2.1 Get Audit Logs — `GET /api/v1/audit-logs`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Filter:
  - `userId` — UUID, opsional
  - `action` — string, opsional
  - `entityType` — string, opsional
  - `entityId` — UUID, opsional
  - `dateFrom` / `dateTo` — DateTime, opsional
- [ ] Pagination & sorting (default: `createdAt DESC`)

#### 1.2.2 Get Audit Log Detail — `GET /api/v1/audit-logs/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Return detail log termasuk metadata (before/after)

### 1.3 Audit Log Interceptor (Otomatis)

- [ ] Buat `AuditLogInterceptor` yang bisa dipasang per controller/endpoint
- [ ] Interceptor otomatis mencatat:
  - User yang melakukan aksi (dari JWT)
  - IP address (dari request)
  - Action (dari metadata decorator)
  - Entity type & ID (dari route params)
- [ ] Buat decorator `@AuditAction(action: string)` untuk menandai endpoint

### 1.4 Activity Worker (RabbitMQ Consumer)

- [ ] Buat `ActivityWorker` yang subscribe ke queue `activity-worker`
- [ ] Handle event:
  | Event | Action Log |
  |---|---|
  | `ticket.created` | `TICKET_CREATED` |
  | `ticket.assigned` | `TICKET_ASSIGNED` |
  | `ticket.status_changed` | `TICKET_STATUS_CHANGED` |
  | `ticket.resolved` | `TICKET_RESOLVED` |
  | `ticket.rejected` | `TICKET_REJECTED` |
- [ ] Setiap event → buat entri `TicketHistory` DAN `ActivityLog`
- [ ] Implementasi idempotency (cek `eventId` agar tidak duplikat)
- [ ] Manual ACK setelah berhasil proses
- [ ] Error → retry 3x → Dead Letter Queue

### 1.5 Daftar Aksi yang Wajib Di-Audit

- [ ] Pastikan aksi berikut tercatat di ActivityLog:
  - Login berhasil & gagal
  - Register user baru
  - Perubahan role user
  - Deactivasi user
  - Reset password (oleh admin)
  - CRUD Department, Category, Priority
  - Create, Update, Cancel ticket
  - Assign & Reassign technician
  - Setiap perubahan status ticket
  - Upload & Delete attachment
  - Submit rating

---

## Definition of Done

- [ ] Semua aksi sensitif tercatat di `ActivityLog` dengan metadata lengkap
- [ ] Activity Worker memproses event dari RabbitMQ dan menulis log
- [ ] Admin bisa melihat audit log dengan filter & pagination
- [ ] Worker idempotent (event duplikat tidak bikin log ganda)
- [ ] TicketHistory terisi otomatis dari Activity Worker
- [ ] Swagger docs lengkap
- [ ] Unit test: AuditLogService, Activity Worker event processing
