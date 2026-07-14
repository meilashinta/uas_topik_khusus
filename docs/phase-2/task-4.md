# Phase 2 — Task 4: Modul Role & Department Management

> **Phase:** 2 — Authentication, User Management, Role, Department  
> **Estimasi:** Hari ke-2  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 7.3 (FR-MASTER-01), Bagian 15.3

---

## Deskripsi

Implementasi CRUD Role (read-only, seeded) dan Department oleh Admin.

---

## Sub-Tasks

### 4.1 Role Module

#### 4.1.1 Get All Roles — `GET /api/v1/roles`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Return list semua role (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMINISTRATOR)
- [x] Role di-seed saat init DB, TIDAK bisa di-create/delete/update via API
- [x] Ini endpoint read-only

#### 4.1.2 Get Role Detail — `GET /api/v1/roles/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Return detail role beserta jumlah user aktif yang memiliki role tersebut

---

### 4.2 Department Module

#### 4.2.1 DTO

- [x] Buat `CreateDepartmentDto`:
  - `name` — string, wajib
  - `code` — string, wajib, unique (mis. "IT", "HR", "FIN")
- [x] Buat `UpdateDepartmentDto`:
  - `name` — string, opsional
  - `code` — string, opsional
  - `isActive` — boolean, opsional

#### 4.2.2 List Departments — `GET /api/v1/departments`

- [x] Auth required, semua role bisa akses (untuk dropdown form)
- [x] Support filter `isActive` (default: hanya yang aktif)
- [x] Support pagination (opsional, biasanya department sedikit)

#### 4.2.3 Get Department Detail — `GET /api/v1/departments/:id`

- [x] Auth required
- [x] Return detail department termasuk jumlah user aktif di dalamnya

#### 4.2.4 Create Department — `POST /api/v1/departments`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Validasi:
  - `code` unik (case-insensitive)
  - `name` tidak kosong
- [x] Catat audit log (`DEPARTMENT_CREATED`)

#### 4.2.5 Update Department — `PATCH /api/v1/departments/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Validasi jika `code` berubah → cek unik
- [x] Catat audit log (`DEPARTMENT_UPDATED`)

#### 4.2.6 Nonaktifkan Department — `DELETE /api/v1/departments/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Implementasi sesuai FR-MASTER-04:
  - Jika department memiliki user aktif atau tiket aktif (OPEN/ASSIGNED/IN_PROGRESS) → TIDAK boleh dihapus, hanya set `isActive = false`
  - Jika tidak memiliki relasi aktif → boleh set `isActive = false` (tetap soft-delete, bukan permanen)
- [x] Catat audit log (`DEPARTMENT_DEACTIVATED`)

---

## Definition of Done

- [x] Role bisa di-read (list & detail), tidak bisa CRUD
- [x] Admin bisa CRUD Department
- [x] Department dengan relasi aktif tidak bisa dihapus permanen
- [x] Code department unik
- [x] List department tersedia untuk semua role (untuk dropdown)
- [x] Audit log tercatat
- [x] Swagger docs lengkap
- [x] Unit test: create department (validasi unique code), deactivate logic
