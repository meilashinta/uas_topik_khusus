# Phase 2 — Task 2: Modul Authentication — Refresh, Logout, Password Management

> **Phase:** 2 — Authentication, User Management, Role, Department  
> **Estimasi:** Hari ke-2  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 7.1 (FR-AUTH-03 s/d FR-AUTH-06), Bagian 15.1

---

## Deskripsi

Melengkapi modul authentication dengan endpoint Refresh Token, Logout, Forgot Password, Reset Password, dan Change Password.

---

## Sub-Tasks

### 2.1 Refresh Token — `POST /api/v1/auth/refresh`

- [ ] Buat DTO `RefreshTokenDto`:
  - `refreshToken` — string, wajib
- [ ] Buat handler:
  1. Verifikasi refresh token (valid & belum expired)
  2. Cek apakah token ada di blacklist Redis → jika ya, tolak (401)
  3. Generate access token baru
  4. Generate refresh token baru (**rotation**: token lama dimasukkan ke blacklist)
  5. Return `{ accessToken, refreshToken }`
- [ ] Blacklist refresh token lama di Redis dengan TTL = sisa masa berlaku
- [ ] Tandai dengan `@Public()`

### 2.2 Logout — `POST /api/v1/auth/logout`

- [ ] Buat handler:
  1. Ambil refresh token dari body request
  2. Masukkan refresh token ke blacklist Redis (key: `blacklist:{tokenHash}`, TTL: sisa masa berlaku)
  3. Return sukses
- [ ] Endpoint ini membutuhkan auth (access token valid)

### 2.3 Forgot Password — `POST /api/v1/auth/forgot-password`

- [ ] Buat DTO `ForgotPasswordDto`:
  - `email` — string, wajib
- [ ] Buat handler:
  1. Cari user berdasarkan email
  2. Jika tidak ditemukan → tetap return sukses (jangan bocorkan info apakah email terdaftar)
  3. Generate token reset (UUID atau random string)
  4. Simpan token di Redis dengan TTL 30 menit (key: `reset:{token}`, value: `userId`)
  5. Kirim email ke user berisi link reset:  
     `{FRONTEND_URL}/reset-password?token={token}`
  6. Rate limit: max 3 request per email per jam
- [ ] Tandai dengan `@Public()`
- [ ] Buat template email reset password (HTML)

### 2.4 Reset Password — `POST /api/v1/auth/reset-password`

- [ ] Buat DTO `ResetPasswordDto`:
  - `token` — string, wajib
  - `newPassword` — string, wajib, min 8 karakter, kombinasi huruf & angka
- [ ] Buat handler:
  1. Cari token di Redis (key: `reset:{token}`)
  2. Jika tidak ditemukan/expired → HTTP 400
  3. Hash password baru dengan BCrypt
  4. Update password user di database
  5. Hapus token dari Redis (sekali pakai)
  6. (Opsional) Invalidasi semua refresh token user yang aktif
- [ ] Tandai dengan `@Public()`

### 2.5 Change Password — `PATCH /api/v1/auth/change-password`

- [ ] Buat DTO `ChangePasswordDto`:
  - `currentPassword` — string, wajib
  - `newPassword` — string, wajib, min 8 karakter
- [ ] Buat handler:
  1. Ambil user dari `@CurrentUser()`
  2. Verifikasi `currentPassword` cocok dengan hash di DB
  3. Validasi `newPassword` tidak sama dengan 3 password terakhir (simpan history password hash di tabel terpisah atau field JSON)
  4. Hash & simpan password baru
  5. Return sukses
- [ ] Endpoint ini membutuhkan auth

### 2.6 Password History

- [ ] Tambahkan model/field untuk menyimpan 3 password hash terakhir per user
  - Opsi A: Tambah tabel `PasswordHistory` (userId, passwordHash, createdAt)
  - Opsi B: Tambah field `previousPasswords` (String array) di model User
- [ ] Update migrasi Prisma jika menambah tabel/field baru
- [ ] Saat change password:
  1. Bandingkan newPassword hash dengan 3 hash terakhir
  2. Jika cocok → tolak dengan pesan "Password baru tidak boleh sama dengan 3 password terakhir"
  3. Simpan hash lama ke history, hapus yang paling lama jika >3

### 2.7 Email Service (untuk Forgot Password)

- [ ] Buat `EmailModule` dan `EmailService`
- [ ] Konfigurasi SMTP menggunakan `nodemailer`:
  - Host, port, user, pass dari environment variable
  - Development: Mailtrap
- [ ] Buat method `sendResetPasswordEmail(to, resetLink)`
- [ ] Buat HTML template sederhana untuk email reset
- [ ] Buat unit test mock untuk `EmailService`

---

## Definition of Done

- [ ] Refresh token rotation bekerja (token lama di-blacklist, token baru digenerate)
- [ ] Logout berhasil blacklist refresh token
- [ ] Forgot password mengirim email ke Mailtrap
- [ ] Reset password mengubah password dan token sekali pakai
- [ ] Change password memvalidasi password lama & mengecek password history
- [ ] Semua endpoint return format response standar
- [ ] Swagger docs lengkap
- [ ] Unit test: refresh token rotation, logout blacklist, password history check
