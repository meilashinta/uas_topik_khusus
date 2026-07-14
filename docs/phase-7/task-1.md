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

- [ ] Jalankan `npm audit` di `app-backend/`
- [ ] Jalankan `npm audit` di `app-frontend/`
- [ ] Fix semua vulnerability dengan severity **Critical** dan **High**
- [ ] Dokumentasikan vulnerability yang tidak bisa di-fix (jika ada) beserta alasannya
- [ ] Pastikan: "Tidak ada kerentanan Critical/High pada dependency scan"

### 1.2 Password Security Review

- [ ] Verifikasi BCrypt cost factor ≥ 10
- [ ] Verifikasi password TIDAK pernah di-log (cek semua log statement)
- [ ] Verifikasi password hash TIDAK pernah di-return di response API
- [ ] Verifikasi password history check (3 password terakhir)
- [ ] Test: brute force protection (rate limit) aktif

### 1.3 JWT Security Review

- [ ] Verifikasi access token TTL = 15 menit (bukan lebih lama)
- [ ] Verifikasi refresh token TTL = 7 hari
- [ ] Verifikasi refresh token rotation aktif
- [ ] Verifikasi refresh token blacklist bekerja setelah logout
- [ ] Verifikasi secret key berbeda untuk access & refresh token
- [ ] Verifikasi secret key cukup kuat (random, min 256-bit)

### 1.4 RBAC Enforcement Review

- [ ] Test setiap endpoint dengan role yang TIDAK diizinkan → pastikan 403
- [ ] Verifikasi RBAC diterapkan di backend Guard (bukan hanya di UI)
- [ ] Verifikasi ownership check:
  - Employee hanya akses tiket miliknya
  - Technician hanya akses tiket yang di-assign
- [ ] Verifikasi tidak ada endpoint yang lupa dipasang guard

### 1.5 Input Validation Review

- [ ] Pastikan SEMUA endpoint memiliki DTO dengan validasi `class-validator`
- [ ] Pastikan `ValidationPipe` global aktif dengan `whitelist: true`
- [ ] Pastikan `forbidNonWhitelisted: true` (strip unknown properties)
- [ ] Test SQL injection basic (mis. `' OR 1=1 --` di field input) → Prisma seharusnya sudah handle
- [ ] Test XSS basic (mis. `<script>alert('xss')</script>` di field input) → pastikan di-sanitize atau di-escape

### 1.6 File Upload Security Review

- [ ] Verifikasi MIME type whitelist aktif
- [ ] Verifikasi max file size = 10MB
- [ ] Verifikasi max attachments = 5 per tiket
- [ ] Test upload file dengan ekstensi berbahaya (`.exe`, `.sh`, `.bat`) → ditolak
- [ ] Test upload file dengan MIME type yang di-spoof → verifikasi handling

### 1.7 Rate Limiting Review

- [ ] Verifikasi rate limit di endpoint:
  - Login: max 5 gagal per 15 menit
  - Forgot password: max 3 per email per jam
- [ ] (Opsional) Tambahkan global rate limiting untuk mencegah DDoS basic

### 1.8 CORS Configuration

- [ ] Konfigurasi CORS di `main.ts`:
  - Hanya izinkan origin dari `FRONTEND_URL`
  - Methods: GET, POST, PATCH, DELETE
  - Credentials: true
- [ ] Verifikasi CORS reject request dari origin yang tidak diizinkan

### 1.9 Helmet & Security Headers

- [ ] Install dan konfigurasi `helmet` untuk HTTP security headers:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
- [ ] Verifikasi headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (untuk production)

### 1.10 Sensitive Data Exposure

- [ ] Pastikan `.env` ada di `.gitignore`
- [ ] Pastikan tidak ada secret/token yang hardcoded di source code
- [ ] Pastikan error response di production TIDAK menampilkan stack trace
- [ ] Pastikan log di production level `info` (bukan `debug`)

---

## Definition of Done

- [ ] `npm audit` — 0 vulnerability Critical/High
- [ ] Password tidak pernah di-log atau di-return
- [ ] JWT security sesuai spesifikasi
- [ ] Semua endpoint memiliki RBAC guard yang benar
- [ ] Input validation aktif di semua endpoint
- [ ] File upload security sesuai spec
- [ ] Rate limiting aktif
- [ ] CORS terkonfigurasi
- [ ] Security headers aktif
- [ ] Tidak ada sensitive data exposure
