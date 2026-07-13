# Phase 2 — Task 1: Modul Authentication — Register & Login

> **Phase:** 2 — Authentication, User Management, Role, Department  
> **Estimasi:** Hari ke-2  
> **Prioritas:** 🔴 Critical (blocking seluruh endpoint yang butuh auth)  
> **Referensi PRD:** Bagian 7.1 (FR-AUTH-01, FR-AUTH-02), Bagian 15.1

---

## Deskripsi

Implementasi endpoint Register dan Login termasuk validasi, hashing password, JWT token generation, dan rate limiting.

---

## Sub-Tasks

### 1.1 DTO (Data Transfer Object)

- [ ] Buat `RegisterDto`:
  - `name` — string, wajib, min 2 karakter
  - `email` — string, wajib, format email valid (`@IsEmail()`)
  - `password` — string, wajib, min 8 karakter, kombinasi huruf & angka (`@Matches`)
  - `departmentId` — UUID, wajib
- [ ] Buat `LoginDto`:
  - `email` — string, wajib
  - `password` — string, wajib
- [ ] Tambahkan Swagger decorator (`@ApiProperty`) di setiap field

### 1.2 Register Endpoint — `POST /api/v1/auth/register`

- [ ] Buat `RegisterCommand` handler (CQRS pattern):
  1. Validasi email unik (query ke DB)
  2. Validasi `departmentId` ada dan aktif
  3. Hash password dengan BCrypt (cost factor ≥ 10)
  4. Simpan user baru dengan role default `EMPLOYEE`
  5. Return data user (tanpa password hash)
- [ ] Tangani error:
  - Email sudah terdaftar → HTTP 409 Conflict
  - Department tidak ditemukan → HTTP 400 Bad Request
  - Validasi gagal → HTTP 400 Bad Request
- [ ] Tambahkan Swagger documentation
- [ ] Tandai endpoint dengan `@Public()` (tidak butuh auth)

### 1.3 Login Endpoint — `POST /api/v1/auth/login`

- [ ] Buat `LoginCommand` handler:
  1. Cari user berdasarkan email
  2. Cek apakah akun aktif (`isActive === true`)
  3. Cek rate limit login (Redis, max 5 gagal per 15 menit)
  4. Bandingkan password dengan BCrypt
  5. Generate access token (JWT, 15 menit):
     ```json
     { "userId": "uuid", "role": "EMPLOYEE", "email": "..." }
     ```
  6. Generate refresh token (JWT, 7 hari)
  7. Reset counter rate limit jika berhasil
  8. Return `{ accessToken, refreshToken, user: { id, name, email, role } }`
- [ ] Tangani error:
  - Email/password salah → HTTP 401 Unauthorized (pesan generic, jangan bocorkan info)
  - Akun non-aktif → HTTP 403 Forbidden
  - Rate limit terlampaui → HTTP 429 Too Many Requests
- [ ] Tambahkan Swagger documentation
- [ ] Tandai endpoint dengan `@Public()`

### 1.4 Rate Limiting Login (Redis)

- [ ] Implementasi rate limiter di `AuthService`:
  - Key: `ratelimit:login:{email}`
  - Increment counter setiap gagal login
  - Set TTL 15 menit pada counter
  - Jika counter ≥ 5, tolak login dengan 429
  - Reset counter saat login berhasil
- [ ] Buat unit test: verifikasi rate limit aktif setelah 5x gagal

### 1.5 JWT Service

- [ ] Buat `JwtTokenService` dengan method:
  - `generateAccessToken(payload): string`
  - `generateRefreshToken(payload): string`
  - `verifyAccessToken(token): payload`
  - `verifyRefreshToken(token): payload`
- [ ] Gunakan secret berbeda untuk access & refresh token (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- [ ] Buat unit test untuk generate & verify token

---

## Definition of Done

- [ ] `POST /api/v1/auth/register` berhasil membuat user baru dan return data user
- [ ] `POST /api/v1/auth/login` berhasil return access & refresh token
- [ ] Password tersimpan sebagai hash BCrypt di database
- [ ] Email duplikat ditolak dengan HTTP 409
- [ ] Validasi input bekerja (email format, password strength)
- [ ] Rate limit login aktif (5x gagal → 429)
- [ ] Access token berisi payload yang benar (`userId`, `role`)
- [ ] Swagger docs lengkap untuk kedua endpoint
- [ ] Unit test: AuthService (register, login, rate limit)
