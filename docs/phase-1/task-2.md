# Phase 1 — Task 2: Desain Database Schema (Prisma ERD)

> **Phase:** 1 — Dokumentasi, Desain & Setup Awal  
> **Estimasi:** Hari ke-1  
> **Prioritas:** 🔴 Critical (blocking seluruh fitur CRUD)  
> **Referensi PRD:** Bagian 10 (Data Model / ERD)

---

## Deskripsi

Membuat seluruh database schema menggunakan Prisma berdasarkan ERD di PRD Bagian 10.2. Setiap entitas, relasi, index, dan constraint harus didefinisikan dengan benar.

---

## Sub-Tasks

### 2.1 Model `Role`

- [ ] Buat model `Role` di `schema.prisma`
  - `id` — UUID, default `uuid()`
  - `name` — Enum `RoleName` (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMINISTRATOR)
  - `description` — String
  - `createdAt` / `updatedAt` — DateTime
- [ ] Buat enum `RoleName` di Prisma

### 2.2 Model `Department`

- [ ] Buat model `Department`
  - `id` — UUID
  - `name` — String
  - `code` — String, unique
  - `isActive` — Boolean, default `true`
  - `createdAt` / `updatedAt` — DateTime
- [ ] Tambahkan relasi ke `User` (one-to-many)
- [ ] Tambahkan index pada `code` dan `isActive`

### 2.3 Model `User`

- [ ] Buat model `User`
  - `id` — UUID
  - `name` — String
  - `email` — String, unique
  - `passwordHash` — String
  - `roleId` — UUID, FK ke `Role`
  - `departmentId` — UUID, FK ke `Department`
  - `phone` — String, nullable
  - `avatarUrl` — String, nullable
  - `isActive` — Boolean, default `true`
  - `createdAt` / `updatedAt` — DateTime
- [ ] Tambahkan relasi ke `Role` (many-to-one)
- [ ] Tambahkan relasi ke `Department` (many-to-one)
- [ ] Tambahkan index pada `email`, `roleId`, `departmentId`, `isActive`

### 2.4 Model `TicketCategory`

- [ ] Buat model `TicketCategory`
  - `id` — UUID
  - `name` — String
  - `description` — String
  - `departmentId` — UUID, FK, nullable
  - `isActive` — Boolean, default `true`
  - `createdAt` / `updatedAt` — DateTime
- [ ] Tambahkan relasi ke `Department` (many-to-one, opsional)
- [ ] Tambahkan index pada `departmentId`, `isActive`

### 2.5 Model `TicketPriority`

- [ ] Buat model `TicketPriority`
  - `id` — UUID
  - `name` — Enum `PriorityLevel` (CRITICAL, HIGH, MEDIUM, LOW)
  - `slaResponseMinutes` — Int (batas waktu first response)
  - `slaResolutionMinutes` — Int (batas waktu resolusi)
  - `createdAt` / `updatedAt` — DateTime
- [ ] Buat enum `PriorityLevel` di Prisma

### 2.6 Model `Ticket`

- [ ] Buat model `Ticket`
  - `id` — UUID
  - `ticketNumber` — String, unique (format `TKT-YYYYMMDD-XXXX`)
  - `title` — String
  - `description` — Text
  - `categoryId` — UUID, FK ke `TicketCategory`
  - `priorityId` — UUID, FK ke `TicketPriority`
  - `status` — Enum `TicketStatus` (OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REJECTED)
  - `createdById` — UUID, FK ke `User`
  - `slaDueAt` — DateTime, nullable
  - `resolvedAt` — DateTime, nullable
  - `closedAt` — DateTime, nullable
  - `createdAt` / `updatedAt` — DateTime
- [ ] Buat enum `TicketStatus` di Prisma
- [ ] Tambahkan relasi ke `User`, `TicketCategory`, `TicketPriority`
- [ ] Tambahkan index pada: `ticketNumber`, `status`, `priorityId`, `categoryId`, `createdById`, `createdAt`

### 2.7 Model `Assignment`

- [ ] Buat model `Assignment`
  - `id` — UUID
  - `ticketId` — UUID, FK ke `Ticket`
  - `technicianId` — UUID, FK ke `User`
  - `assignedById` — UUID, FK ke `User`
  - `reason` — String, nullable (wajib jika reassign)
  - `assignedAt` — DateTime
  - `isActive` — Boolean (hanya 1 assignment aktif per tiket)
- [ ] Tambahkan constraint: hanya 1 assignment aktif per tiket (bisa via unique composite index atau validasi di service layer)
- [ ] Tambahkan index pada `ticketId`, `technicianId`, `isActive`

### 2.8 Model `TicketComment`

- [ ] Buat model `TicketComment`
  - `id` — UUID
  - `ticketId` — UUID, FK
  - `userId` — UUID, FK
  - `content` — Text
  - `isInternal` — Boolean (default `false`)
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `Ticket` dan `User`
- [ ] Tambahkan index pada `ticketId`, `isInternal`

### 2.9 Model `TicketAttachment`

- [ ] Buat model `TicketAttachment`
  - `id` — UUID
  - `ticketId` — UUID, FK
  - `uploadedById` — UUID, FK
  - `fileName` — String
  - `fileUrl` — String
  - `fileSize` — Int (bytes, max 10MB = 10485760)
  - `mimeType` — String
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `Ticket` dan `User`
- [ ] Tambahkan index pada `ticketId`

### 2.10 Model `TicketHistory`

- [ ] Buat model `TicketHistory`
  - `id` — UUID
  - `ticketId` — UUID, FK
  - `fromStatus` — String, nullable (null saat tiket pertama dibuat)
  - `toStatus` — String
  - `changedById` — UUID, FK
  - `note` — String, nullable
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `Ticket` dan `User`
- [ ] Tambahkan index pada `ticketId`, `createdAt`

### 2.11 Model `Notification`

- [ ] Buat model `Notification`
  - `id` — UUID
  - `userId` — UUID, FK
  - `type` — String (mis. TICKET_ASSIGNED, SLA_WARNING)
  - `title` — String
  - `message` — String
  - `isRead` — Boolean, default `false`
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `User`
- [ ] Tambahkan index pada `userId`, `isRead`, `createdAt`

### 2.12 Model `ActivityLog` (Audit Trail)

- [ ] Buat model `ActivityLog`
  - `id` — UUID
  - `userId` — UUID, FK, nullable (nullable untuk aksi sistem)
  - `action` — String (mis. TICKET_CREATED, USER_ROLE_CHANGED)
  - `entityType` — String
  - `entityId` — UUID
  - `metadata` — Json (JSONB, payload before/after)
  - `ipAddress` — String
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `User` (opsional, nullable)
- [ ] Tambahkan index pada `userId`, `entityType`, `entityId`, `action`, `createdAt`

### 2.13 Model `Rating`

- [ ] Buat model `Rating`
  - `id` — UUID
  - `ticketId` — UUID, FK, unique (1 tiket = 1 rating)
  - `ratedById` — UUID, FK
  - `score` — Int (validasi 1-5 di service layer)
  - `feedback` — Text, nullable
  - `createdAt` — DateTime
- [ ] Tambahkan relasi ke `Ticket` (one-to-one) dan `User`

### 2.14 Migrasi & Seed Data

- [ ] Jalankan `npx prisma migrate dev --name init` untuk generate migrasi
- [ ] Buat file `prisma/seed.ts` untuk seed data awal:
  - 4 Role default (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMINISTRATOR)
  - 4 TicketPriority default (CRITICAL, HIGH, MEDIUM, LOW) dengan SLA sesuai Bagian 11
  - 1 Department contoh
  - 1 User admin default
- [ ] Konfigurasi seed script di `package.json`
  ```json
  "prisma": { "seed": "ts-node prisma/seed.ts" }
  ```
- [ ] Jalankan `npx prisma db seed` untuk verifikasi

---

## Definition of Done

- [ ] Semua 13 model terdefinisi di `schema.prisma`
- [ ] `npx prisma migrate dev` berhasil tanpa error
- [ ] `npx prisma generate` berhasil
- [ ] Prisma Studio (`npx prisma studio`) menampilkan semua tabel dengan relasi benar
- [ ] Seed data berhasil dijalankan
- [ ] Semua FK dan index terdefinisi sesuai PRD Bagian 10.2
