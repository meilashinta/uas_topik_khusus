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

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Return list semua role (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMINISTRATOR)
- [ ] Role di-seed saat init DB, TIDAK bisa di-create/delete/update via API
- [ ] Ini endpoint read-only

#### 4.1.2 Get Role Detail — `GET /api/v1/roles/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Return detail role beserta jumlah user aktif yang memiliki role tersebut

---

### 4.2 Department Module

#### 4.2.1 DTO

- [ ] Buat `CreateDepartmentDto`:
  - `name` — string, wajib
  - `code` — string, wajib, unique (mis. "IT", "HR", "FIN")
- [ ] Buat `UpdateDepartmentDto`:
  - `name` — string, opsional
  - `code` — string, opsional
  - `isActive` — boolean, opsional

#### 4.2.2 List Departments — `GET /api/v1/departments`

- [ ] Auth required, semua role bisa akses (untuk dropdown form)
- [ ] Support filter `isActive` (default: hanya yang aktif)
- [ ] Support pagination (opsional, biasanya department sedikit)

#### 4.2.3 Get Department Detail — `GET /api/v1/departments/:id`

- [ ] Auth required
- [ ] Return detail department termasuk jumlah user aktif di dalamnya

#### 4.2.4 Create Department — `POST /api/v1/departments`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Validasi:
  - `code` unik (case-insensitive)
  - `name` tidak kosong
- [ ] Catat audit log (`DEPARTMENT_CREATED`)

#### 4.2.5 Update Department — `PATCH /api/v1/departments/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Validasi jika `code` berubah → cek unik
- [ ] Catat audit log (`DEPARTMENT_UPDATED`)

#### 4.2.6 Nonaktifkan Department — `DELETE /api/v1/departments/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Implementasi sesuai FR-MASTER-04:
  - Jika department memiliki user aktif atau tiket aktif (OPEN/ASSIGNED/IN_PROGRESS) → TIDAK boleh dihapus, hanya set `isActive = false`
  - Jika tidak memiliki relasi aktif → boleh set `isActive = false` (tetap soft-delete, bukan permanen)
- [ ] Catat audit log (`DEPARTMENT_DEACTIVATED`)

---

## Definition of Done

- [ ] Role bisa di-read (list & detail), tidak bisa CRUD
- [ ] Admin bisa CRUD Department
- [ ] Department dengan relasi aktif tidak bisa dihapus permanen
- [ ] Code department unik
- [ ] List department tersedia untuk semua role (untuk dropdown)
- [ ] Audit log tercatat
- [ ] Swagger docs lengkap
- [ ] Unit test: create department (validasi unique code), deactivate logic
