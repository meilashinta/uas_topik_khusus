# Phase 4 — Task 3: Modul Attachment (Upload/Download File)

> **Phase:** 4 — Assignment, Comment, Attachment, Notification  
> **Estimasi:** Hari ke-4  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 5.2 (Asumsi: max 10MB, max 5 file), Bagian 16.2 (Security), Bagian 15.6

---

## Deskripsi

Implementasi fitur upload dan download lampiran tiket dengan validasi keamanan (tipe file, ukuran, jumlah).

---

## Sub-Tasks

### 3.1 File Storage Service

- [ ] Buat `FileStorageService` dengan interface abstrak:
  ```typescript
  interface IFileStorageService {
    upload(file: Express.Multer.File, path: string): Promise<string>; // return URL
    download(path: string): Promise<Buffer>;
    delete(path: string): Promise<void>;
  }
  ```
- [ ] Implementasi `LocalFileStorageService` (development):
  - Simpan file ke folder `uploads/` di root project
  - Return URL relatif: `/uploads/{filename}`
  - Buat static file serving di NestJS
- [ ] (Opsional) Implementasi `SupabaseStorageService` (production):
  - Upload ke Supabase Storage bucket
  - Return public URL
- [ ] Konfigurasi via env: `FILE_STORAGE_PROVIDER=local|supabase`

### 3.2 File Validation

- [ ] Buat `FileValidationPipe` yang memvalidasi:
  - **Ukuran max**: 10MB per file (10485760 bytes)
  - **MIME type whitelist** (PRD Bagian 16.2):
    - Gambar: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
    - PDF: `application/pdf`
    - Dokumen: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
    - Spreadsheet: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - **Jumlah max**: 5 lampiran per tiket
- [ ] Return error yang jelas:
  - File terlalu besar → HTTP 413 "Ukuran file melebihi batas maksimum 10MB"
  - Tipe file tidak diizinkan → HTTP 400 "Tipe file {mimeType} tidak diizinkan"
  - Jumlah file melebihi batas → HTTP 400 "Maksimum 5 lampiran per tiket"

### 3.3 Upload Attachment — `POST /api/v1/tickets/:id/attachments`

- [ ] Auth required (Employee, Technician, Supervisor, Admin)
- [ ] Gunakan `@UseInterceptors(FileInterceptor('file'))` atau `FilesInterceptor` untuk multiple files
- [ ] Buat handler:
  1. Validasi tiket ada
  2. Validasi akses ke tiket (ownership/assignment)
  3. Cek jumlah lampiran existing + baru ≤ 5
  4. Validasi file (size, mime type)
  5. Upload file via `FileStorageService`
  6. Simpan metadata ke `TicketAttachment`:
     - `fileName` — nama asli file
     - `fileUrl` — URL/path file yang tersimpan
     - `fileSize` — ukuran dalam bytes
     - `mimeType` — tipe MIME
     - `uploadedById` — user yang upload
  7. Return data attachment

### 3.4 Download Attachment — `GET /api/v1/tickets/:id/attachments/:attachmentId`

- [ ] Auth required
- [ ] Validasi akses ke tiket
- [ ] Stream file dari storage sebagai download
- [ ] Set header `Content-Disposition: attachment; filename="{originalName}"`
- [ ] Set header `Content-Type` sesuai mimeType

### 3.5 Delete Attachment — `DELETE /api/v1/tickets/:id/attachments/:attachmentId`

- [ ] Auth required
- [ ] Validasi:
  - User adalah pemilik attachment ATAU memiliki role SUPERVISOR/ADMIN
  - Tiket masih dalam status yang memungkinkan perubahan (bukan CLOSED/REJECTED)
- [ ] Hapus file dari storage
- [ ] Hapus record dari database
- [ ] Catat audit log

### 3.6 List Attachments per Ticket

- [ ] Sudah termasuk di response `GET /api/v1/tickets/:id` (detail tiket)
- [ ] Pastikan include: `id`, `fileName`, `fileSize`, `mimeType`, `uploadedBy` (nama), `createdAt`

---

## Definition of Done

- [ ] Upload file berhasil tersimpan dan metadata tercatat
- [ ] Download file berfungsi dengan header yang benar
- [ ] Validasi ukuran file (max 10MB) bekerja
- [ ] Validasi MIME type bekerja (tolak file berbahaya)
- [ ] Validasi jumlah max 5 lampiran per tiket
- [ ] Delete attachment menghapus file dari storage
- [ ] Swagger docs lengkap (multipart/form-data)
- [ ] Unit test: file validation, upload logic, max attachment count
