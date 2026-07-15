# Phase 7 — Task 1: Hardening Keamanan

> **Phase:** 7 — Dokumentasi Final, Hardening Keamanan, Presentasi  
> **Estimasi:** Hari ke-7  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 16.2 (Security NFR), Bagian 17 (Security Test)

---

## Deskripsi

Review dan hardening keamanan seluruh aplikasi sebelum rilis. Memastikan tidak ada celah keamanan kritis.

---

## Sub-Tasks

### 1.1 Dependency Security Audit

- [x] Jalankan `npm audit` di `app-backend/`
- [x] Jalankan `npm audit` di `app-frontend/`
- [x] Fix semua vulnerability dengan severity **Critical** dan **High**
- [x] Dokumentasikan vulnerability yang tidak bisa di-fix (jika ada) beserta alasannya
- [x] Pastikan: "Tidak ada kerentanan Critical/High pada dependency scan"

### 1.2 Password Security Review

- [x] Verifikasi BCrypt cost factor ≥ 10
- [x] Verifikasi password TIDAK pernah di-log (cek semua log statement)
- [x] Verifikasi password hash TIDAK pernah di-return di response API
- [x] Verifikasi password history check (3 password terakhir)
- [x] Test: brute force protection (rate limit) aktif

### 1.3 JWT Security Review

- [x] Verifikasi access token TTL = 15 menit (bukan lebih lama)
- [x] Verifikasi refresh token TTL = 7 hari
- [x] Verifikasi refresh token rotation aktif
- [x] Verifikasi refresh token blacklist bekerja setelah logout
- [x] Verifikasi secret key berbeda untuk access & refresh token
- [x] Verifikasi secret key cukup kuat (random, min 256-bit)

### 1.4 RBAC Enforcement Review

- [x] Test setiap endpoint dengan role yang TIDAK diizinkan → pastikan 403
- [x] Verifikasi RBAC diterapkan di backend Guard (bukan hanya di UI)
- [x] Verifikasi ownership check:
  - Employee hanya akses tiket miliknya
  - Technician hanya akses tiket yang di-assign
- [x] Verifikasi tidak ada endpoint yang lupa dipasang guard

### 1.5 Input Validation Review

- [x] Pastikan SEMUA endpoint memiliki DTO dengan validasi `class-validator`
- [x] Pastikan `ValidationPipe` global aktif dengan `whitelist: true`
- [x] Pastikan `forbidNonWhitelisted: true` (strip unknown properties)
- [x] Test SQL injection basic (mis. `' OR 1=1 --` di field input) → Prisma seharusnya sudah handle
- [x] Test XSS basic (mis. `<script>alert('xss')</script>` di field input) → pastikan di-sanitize atau di-escape

### 1.6 File Upload Security Review

- [x] Verifikasi MIME type whitelist aktif
- [x] Verifikasi max file size = 10MB
- [x] Verifikasi max attachments = 5 per tiket
- [x] Test upload file dengan ekstensi berbahaya (`.exe`, `.sh`, `.bat`) → ditolak
- [x] Test upload file dengan MIME type yang di-spoof → verifikasi handling

### 1.7 Rate Limiting Review

- [x] Verifikasi rate limit di endpoint:
  - Login: max 5 gagal per 15 menit
  - Forgot password: max 3 per email per jam
- [x] (Opsional) Tambahkan global rate limiting untuk mencegah DDoS basic

### 1.8 CORS Configuration

- [x] Konfigurasi CORS di `main.ts`:
  - Hanya izinkan origin dari `FRONTEND_URL`
  - Methods: GET, POST, PATCH, DELETE
  - Credentials: true
- [x] Verifikasi CORS reject request dari origin yang tidak diizinkan

### 1.9 Helmet & Security Headers

- [x] Install dan konfigurasi `helmet` untuk HTTP security headers:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
- [x] Verifikasi headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (untuk production)

### 1.10 Sensitive Data Exposure

- [x] Pastikan `.env` ada di `.gitignore`
- [x] Pastikan tidak ada secret/token yang hardcoded di source code
- [x] Pastikan error response di production TIDAK menampilkan stack trace
- [x] Pastikan log di production level `info` (bukan `debug`)

---

## Definition of Done

- [x] `npm audit` — 0 vulnerability Critical/High
- [x] Password tidak pernah di-log atau di-return
- [x] JWT security sesuai spesifikasi
- [x] Semua endpoint memiliki RBAC guard yang benar
- [x] Input validation aktif di semua endpoint
- [x] File upload security sesuai spec
- [x] Rate limiting aktif
- [x] CORS terkonfigurasi
- [x] Security headers aktif
- [x] Tidak ada sensitive data exposure
