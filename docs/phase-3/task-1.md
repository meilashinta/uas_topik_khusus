# Phase 3 — Task 1: Modul Category & Priority/SLA Management

> **Phase:** 3 — Ticket Management (CRUD + State Machine), Category, Priority/SLA  
> **Estimasi:** Hari ke-3  
> **Prioritas:** 🔴 Critical (blocking Ticket Management)  
> **Referensi PRD:** Bagian 7.3 (FR-MASTER-02, FR-MASTER-03, FR-MASTER-04), Bagian 11 (SLA Rules), Bagian 15.3

---

## Deskripsi

Implementasi CRUD Ticket Category dan Priority/SLA yang menjadi master data untuk pembuatan tiket.

---

## Sub-Tasks

### 1.1 Category Module

#### 1.1.1 DTO

- [ ] Buat `CreateCategoryDto`:
  - `name` — string, wajib
  - `description` — string, wajib
  - `departmentId` — UUID, opsional (FK ke Department)
- [ ] Buat `UpdateCategoryDto`:
  - `name` — string, opsional
  - `description` — string, opsional
  - `departmentId` — UUID, opsional
  - `isActive` — boolean, opsional

#### 1.1.2 List Categories — `GET /api/v1/categories`

- [ ] Auth required, semua role
- [ ] Filter: `departmentId`, `isActive`
- [ ] Support pagination

#### 1.1.3 Get Category Detail — `GET /api/v1/categories/:id`

- [ ] Auth required
- [ ] Return detail + jumlah tiket terkait

#### 1.1.4 Create Category — `POST /api/v1/categories`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Validasi departmentId ada (jika diberikan)
- [ ] Catat audit log

#### 1.1.5 Update Category — `PATCH /api/v1/categories/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Catat audit log

#### 1.1.6 Nonaktifkan Category — `DELETE /api/v1/categories/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] FR-MASTER-04: Jika category dipakai di tiket aktif → soft delete saja
- [ ] Catat audit log

---

### 1.2 Priority/SLA Module

#### 1.2.1 DTO

- [ ] Buat `CreatePriorityDto`:
  - `name` — enum PriorityLevel (CRITICAL, HIGH, MEDIUM, LOW)
  - `slaResponseMinutes` — int, wajib
  - `slaResolutionMinutes` — int, wajib
- [ ] Buat `UpdatePriorityDto`:
  - `slaResponseMinutes` — int, opsional
  - `slaResolutionMinutes` — int, opsional

#### 1.2.2 List Priorities — `GET /api/v1/priorities`

- [ ] Auth required, semua role
- [ ] Return semua priority beserta SLA time

#### 1.2.3 Get Priority Detail — `GET /api/v1/priorities/:id`

- [ ] Auth required
- [ ] Return detail priority + SLA

#### 1.2.4 Create Priority — `POST /api/v1/priorities`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Validasi name unik
- [ ] Catat audit log

#### 1.2.5 Update Priority (SLA time) — `PATCH /api/v1/priorities/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Hanya `slaResponseMinutes` dan `slaResolutionMinutes` yang bisa diubah
- [ ] Name TIDAK boleh diubah setelah dibuat
- [ ] Catat audit log

#### 1.2.6 Nonaktifkan Priority — `DELETE /api/v1/priorities/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Soft delete, tidak boleh hapus permanen jika dipakai tiket aktif
- [ ] Catat audit log

### 1.3 Seed Default Priority/SLA

- [ ] Pastikan seed data sesuai PRD Bagian 11:
  | Priority | FRT | Resolution |
  |---|---|---|
  | CRITICAL | 30 menit | 4 jam (240 menit) |
  | HIGH | 60 menit | 8 jam (480 menit) |
  | MEDIUM | 240 menit | 24 jam (1440 menit) |
  | LOW | 480 menit | 72 jam (4320 menit) |

---

## Definition of Done

- [ ] Admin bisa CRUD Category & Priority
- [ ] Master data yang aktif di tiket tidak bisa dihapus permanen
- [ ] List category & priority tersedia untuk semua role (dropdown form tiket)
- [ ] Seed priority/SLA sesuai PRD
- [ ] Audit log tercatat
- [ ] Swagger docs lengkap
- [ ] Unit test: create category, deactivate logic, SLA value validation
