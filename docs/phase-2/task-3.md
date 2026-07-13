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

- [ ] Buat `CreateUserDto`:
  - `name` — string, wajib
  - `email` — string, wajib, format email
  - `password` — string, wajib, min 8 karakter
  - `roleId` — UUID, wajib
  - `departmentId` — UUID, wajib
  - `phone` — string, opsional
- [ ] Buat `UpdateUserDto`:
  - `name` — string, opsional
  - `roleId` — UUID, opsional
  - `departmentId` — UUID, opsional
  - `phone` — string, opsional
  - `isActive` — boolean, opsional
- [ ] Buat `UpdateProfileDto` (untuk user sendiri):
  - `name` — string, opsional
  - `phone` — string, opsional
  - `avatarUrl` — string, opsional
- [ ] Buat `UserFilterDto` (extends `PaginationQueryDto`):
  - `roleId` — UUID, opsional
  - `departmentId` — UUID, opsional
  - `isActive` — boolean, opsional
  - `search` — string, opsional (nama/email)

### 3.2 List Users — `GET /api/v1/users`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Buat query handler:
  1. Filter berdasarkan `UserFilterDto` (role, department, status, search)
  2. Pagination & sorting
  3. Return list user (tanpa passwordHash!) dengan meta pagination
- [ ] Implementasi search pada field `name` dan `email` (case-insensitive)

### 3.3 Get User Detail — `GET /api/v1/users/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Return detail user beserta relasi role & department
- [ ] Jika user tidak ditemukan → HTTP 404

### 3.4 Create User — `POST /api/v1/users`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Buat command handler:
  1. Validasi email unik
  2. Validasi `roleId` ada
  3. Validasi `departmentId` ada dan aktif
  4. Hash password dengan BCrypt
  5. Simpan user baru
  6. Catat audit log (`USER_CREATED`)
  7. Return data user baru

### 3.5 Update User — `PATCH /api/v1/users/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Buat command handler:
  1. Cari user by ID
  2. Jika `roleId` berubah → validasi roleId ada, catat audit log (`USER_ROLE_CHANGED`)
  3. Jika `departmentId` berubah → validasi departmentId aktif
  4. Update field yang diberikan
  5. Invalidasi cache user (`user:{id}`)
  6. Catat audit log (`USER_UPDATED`)

### 3.6 Nonaktifkan User (Soft Delete) — `DELETE /api/v1/users/:id`

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Buat command handler:
  1. Set `isActive = false` (BUKAN hapus permanen)
  2. Invalidasi semua session/refresh token user
  3. Catat audit log (`USER_DEACTIVATED`)
- [ ] Jangan izinkan admin menonaktifkan dirinya sendiri

### 3.7 Reset Password User — admin action

- [ ] Role: `@Roles('ADMINISTRATOR')`
- [ ] Endpoint: `POST /api/v1/users/:id/reset-password`
- [ ] Handler:
  1. Generate token reset atau password temporary
  2. Kirim email set-password baru ke user
  3. Catat audit log (`USER_PASSWORD_RESET`)

### 3.8 Update Profil Sendiri — `PATCH /api/v1/users/me`

- [ ] Auth required, semua role
- [ ] Hanya boleh mengubah: `name`, `phone`, `avatarUrl`
- [ ] TIDAK boleh mengubah: `email`, `role`, `department` (tanpa approval admin)
- [ ] Invalidasi cache user

### 3.9 Get Profil Sendiri — `GET /api/v1/users/me`

- [ ] Auth required, semua role
- [ ] Return data user lengkap dengan role & department (tanpa passwordHash)

---

## Definition of Done

- [ ] Admin bisa CRUD user
- [ ] Admin bisa soft-delete (nonaktifkan) user
- [ ] Admin bisa reset password user lain
- [ ] User bisa update profil sendiri (nama, foto, telp)
- [ ] User TIDAK bisa ubah role/email sendiri
- [ ] Password hash TIDAK pernah di-return di response
- [ ] Pagination & filter bekerja di list users
- [ ] Audit log tercatat untuk aksi sensitif
- [ ] Swagger docs lengkap
- [ ] Unit test: CreateUserCommand, UpdateUserCommand, soft delete logic
