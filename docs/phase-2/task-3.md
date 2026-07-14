# Phase 2 — Task 3: Modul User Management

> **Phase:** 2 — Authentication, User Management, Role, Department  
> **Estimasi:** Hari ke-2  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 7.2 (FR-USER), Bagian 15.2

---

## Deskripsi

Implementasi CRUD User oleh Admin dan fitur update profil sendiri oleh setiap user.

---

## Sub-Tasks

### 3.1 DTO

- [x] Buat `CreateUserDto`:
  - `name` — string, wajib
  - `email` — string, wajib, format email
  - `password` — string, wajib, min 8 karakter
  - `roleId` — UUID, wajib
  - `departmentId` — UUID, wajib
  - `phone` — string, opsional
- [x] Buat `UpdateUserDto`:
  - `name` — string, opsional
  - `roleId` — UUID, opsional
  - `departmentId` — UUID, opsional
  - `phone` — string, opsional
  - `isActive` — boolean, opsional
- [x] Buat `UpdateProfileDto` (untuk user sendiri):
  - `name` — string, opsional
  - `phone` — string, opsional
  - `avatarUrl` — string, opsional
- [x] Buat `UserFilterDto` (extends `PaginationQueryDto`):
  - `roleId` — UUID, opsional
  - `departmentId` — UUID, opsional
  - `isActive` — boolean, opsional
  - `search` — string, opsional (nama/email)

### 3.2 List Users — `GET /api/v1/users`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Buat query handler:
  1. Filter berdasarkan `UserFilterDto` (role, department, status, search)
  2. Pagination & sorting
  3. Return list user (tanpa passwordHash!) dengan meta pagination
- [x] Implementasi search pada field `name` dan `email` (case-insensitive)

### 3.3 Get User Detail — `GET /api/v1/users/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Return detail user beserta relasi role & department
- [x] Jika user tidak ditemukan → HTTP 404

### 3.4 Create User — `POST /api/v1/users`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Buat command handler:
  1. Validasi email unik
  2. Validasi `roleId` ada
  3. Validasi `departmentId` ada dan aktif
  4. Hash password dengan BCrypt
  5. Simpan user baru
  6. Catat audit log (`USER_CREATED`)
  7. Return data user baru

### 3.5 Update User — `PATCH /api/v1/users/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Buat command handler:
  1. Cari user by ID
  2. Jika `roleId` berubah → validasi roleId ada, catat audit log (`USER_ROLE_CHANGED`)
  3. Jika `departmentId` berubah → validasi departmentId aktif
  4. Update field yang diberikan
  5. Invalidasi cache user (`user:{id}`)
  6. Catat audit log (`USER_UPDATED`)

### 3.6 Nonaktifkan User (Soft Delete) — `DELETE /api/v1/users/:id`

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Buat command handler:
  1. Set `isActive = false` (BUKAN hapus permanen)
  2. Invalidasi semua session/refresh token user
  3. Catat audit log (`USER_DEACTIVATED`)
- [x] Jangan izinkan admin menonaktifkan dirinya sendiri

### 3.7 Reset Password User — admin action

- [x] Role: `@Roles('ADMINISTRATOR')`
- [x] Endpoint: `POST /api/v1/users/:id/reset-password`
- [x] Handler:
  1. Generate token reset atau password temporary
  2. Kirim email set-password baru ke user
  3. Catat audit log (`USER_PASSWORD_RESET`)

### 3.8 Update Profil Sendiri — `PATCH /api/v1/users/me`

- [x] Auth required, semua role
- [x] Hanya boleh mengubah: `name`, `phone`, `avatarUrl`
- [x] TIDAK boleh mengubah: `email`, `role`, `department` (tanpa approval admin)
- [x] Invalidasi cache user

### 3.9 Get Profil Sendiri — `GET /api/v1/users/me`

- [x] Auth required, semua role
- [x] Return data user lengkap dengan role & department (tanpa passwordHash)

---

## Definition of Done

- [x] Admin bisa CRUD user
- [x] Admin bisa soft-delete (nonaktifkan) user
- [x] Admin bisa reset password user lain
- [x] User bisa update profil sendiri (nama, foto, telp)
- [x] User TIDAK bisa ubah role/email sendiri
- [x] Password hash TIDAK pernah di-return di response
- [x] Pagination & filter bekerja di list users
- [x] Audit log tercatat untuk aksi sensitif
- [x] Swagger docs lengkap
- [x] Unit test: CreateUserCommand, UpdateUserCommand, soft delete logic
