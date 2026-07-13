# Phase 1 — Task 3: Setup Common Module (Guards, Interceptors, Filters, Decorators)

> **Phase:** 1 — Dokumentasi, Desain & Setup Awal  
> **Estimasi:** Hari ke-1  
> **Prioritas:** 🔴 Critical (dibutuhkan oleh seluruh module)  
> **Referensi PRD:** Bagian 4.5 (RBAC Matrix), Bagian 15.10 (Format Response), Bagian 16.2 (Security), Bagian 16.6 (Logging)

---

## Deskripsi

Membuat common module yang menyediakan komponen reusable untuk seluruh modul: guards (autentikasi & RBAC), interceptors (response transform & logging), filters (exception handling), dan decorators (custom parameter).

---

## Sub-Tasks

### 3.1 Standar Format Response

- [x] Buat interface `ApiResponse<T>` sesuai PRD Bagian 15.10:
  ```typescript
  interface ApiResponse<T> {
    success: boolean;
    data?: T;
    meta?: { page: number; limit: number; total: number };
    error?: { code: string; message: string; details: any[] };
  }
  ```
- [x] Buat class `ResponseTransformInterceptor` yang membungkus semua response controller ke format standar

### 3.2 Exception Filter Global

- [x] Buat `HttpExceptionFilter` yang menangkap semua exception dan mengembalikan format error standar
- [x] Mapping HTTP status code ke error code:
  - `400` → `BAD_REQUEST`
  - `401` → `UNAUTHORIZED`
  - `403` → `FORBIDDEN`
  - `404` → `NOT_FOUND`
  - `409` → `CONFLICT`
  - `422` → `UNPROCESSABLE_ENTITY`
  - `429` → `TOO_MANY_REQUESTS`
  - `500` → `INTERNAL_SERVER_ERROR`
- [x] Pastikan stack trace hanya tampil di `NODE_ENV !== 'production'`

### 3.3 JWT Authentication Guard

- [x] Buat `JwtAuthGuard` menggunakan `@nestjs/passport`
- [x] Buat `JwtStrategy` yang memvalidasi access token dan mengekstrak payload (`userId`, `role`, `exp`)
- [x] Buat decorator `@Public()` untuk menandai endpoint yang tidak butuh autentikasi (mis. login, register)
- [x] Daftarkan `JwtAuthGuard` sebagai global guard di `app.module.ts`

### 3.4 Role-Based Access Control (RBAC) Guard

- [x] Buat decorator `@Roles(...roles: RoleName[])` untuk menandai endpoint dengan role yang diizinkan
- [x] Buat `RolesGuard` yang membaca metadata `@Roles()` dan membandingkan dengan `req.user.role`
- [x] Return `ForbiddenException` jika role tidak sesuai dengan pesan error yang jelas

### 3.5 Ownership Guard / Policy

- [x] Buat decorator `@CheckOwnership()` untuk validasi kepemilikan resource
- [x] Buat `OwnershipGuard` yang generic — menerima parameter entity type dan field untuk membandingkan `req.user.id` dengan `entity.createdById` (atau field lainnya)
- [x] Pastikan bisa dikombinasikan dengan `@Roles()`: contoh Employee hanya bisa akses tiket miliknya

### 3.6 Request Logging Interceptor

- [x] Buat `LoggingInterceptor` yang mencatat:
  - Method & URL
  - User ID (jika ada)
  - Response time (ms)
  - Status code
  - Correlation ID (UUID per request)
- [x] Format log: Structured JSON sesuai PRD Bagian 16.6
- [x] Buat middleware `CorrelationIdMiddleware` yang menambahkan `x-correlation-id` ke setiap request

### 3.7 Pagination DTO

- [x] Buat class `PaginationQueryDto` yang reusable:
  ```typescript
  class PaginationQueryDto {
    @IsOptional() @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
    @IsOptional() @IsString() sortBy?: string;
    @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
  }
  ```
- [x] Buat helper function `buildPaginationMeta(total, page, limit)` untuk generate meta pagination

### 3.8 Custom Decorators

- [x] Buat decorator `@CurrentUser()` untuk mengambil user dari `req.user` di controller
- [x] Buat decorator `@ApiPaginatedResponse(model)` untuk Swagger documentation otomatis
- [x] Buat decorator `@IpAddress()` untuk mengambil IP address dari request (untuk audit log)

### 3.9 Validation Pipe Global

- [x] Konfigurasi `ValidationPipe` global di `main.ts`:
  - `whitelist: true` — strip property yang tidak ada di DTO
  - `forbidNonWhitelisted: true` — throw error jika ada property asing
  - `transform: true` — auto-transform tipe data
  - `exceptionFactory` — custom error format sesuai standar response

---

## Definition of Done

- [x] Semua guard, interceptor, filter, dan decorator terdaftar di `CommonModule`
- [x] Global guard (JWT) aktif — endpoint tanpa `@Public()` return 401 jika tanpa token
- [x] Format response konsisten di semua endpoint (success & error)
- [x] Logging terstruktur berjalan dengan correlation ID
- [x] Unit test untuk `RolesGuard` — verifikasi role EMPLOYEE tidak bisa akses endpoint ADMIN
- [x] Unit test untuk `ResponseTransformInterceptor` — verifikasi format output
