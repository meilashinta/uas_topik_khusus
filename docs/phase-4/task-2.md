# Phase 4 — Task 2: Modul Comment (Public & Internal)

> **Phase:** 4 — Assignment, Comment, Attachment, Notification  
> **Estimasi:** Hari ke-4  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 7.6 (FR-PROGRESS-03, FR-PROGRESS-04), Bagian 15.6

---

## Deskripsi

Implementasi fitur komentar pada tiket, termasuk komentar publik (terlihat semua pihak) dan catatan internal (hanya terlihat oleh Technician, Supervisor, Administrator).

---

## Sub-Tasks

### 2.1 DTO

- [ ] Buat `CreateCommentDto`:
  - `content` — string, wajib, min 1 karakter
  - `isInternal` — boolean, default `false`
- [ ] Buat `CommentFilterDto`:
  - `isInternal` — boolean, opsional (untuk filtering)

### 2.2 Add Comment — `POST /api/v1/tickets/:id/comments`

- [ ] Auth required, semua role
- [ ] Buat `AddCommentCommand` handler:
  1. Cari tiket by ID
  2. Validasi akses ke tiket (sesuai role & ownership)
  3. Validasi role untuk `isInternal`:
     - **Employee** TIDAK boleh membuat komentar internal → jika `isInternal = true`, tolak dengan HTTP 403
     - **Technician, Supervisor, Administrator** boleh membuat kedua jenis
  4. Simpan comment ke `TicketComment`
  5. Publish event (opsional, untuk notifikasi real-time)
  6. Invalidasi cache tiket

### 2.3 Get Comments — `GET /api/v1/tickets/:id/comments`

- [ ] Auth required
- [ ] Buat query handler:
  - Ambil semua komentar untuk tiket
  - **Filtering berdasarkan role**:
    - Employee: hanya melihat komentar `isInternal = false`
    - Technician, Supervisor, Administrator: melihat semua komentar
  - Ordered by `createdAt ASC` (kronologis)
  - Include: `user` (nama, role), `content`, `isInternal`, `createdAt`
  - Pagination opsional

### 2.4 Access Control per Comment

- [ ] Pastikan Employee hanya bisa:
  - Melihat komentar publik di tiket miliknya
  - Membuat komentar publik di tiket miliknya
- [ ] Pastikan Technician hanya bisa:
  - Melihat & membuat komentar di tiket yang di-assign kepadanya
- [ ] Supervisor & Admin bisa akses semua

---

## Definition of Done

- [ ] User bisa menambah komentar di tiket
- [ ] Employee TIDAK bisa melihat komentar internal
- [ ] Employee TIDAK bisa membuat komentar internal
- [ ] Komentar ditampilkan kronologis
- [ ] Access control per role bekerja
- [ ] Swagger docs lengkap
- [ ] Unit test: create comment, internal visibility filter
