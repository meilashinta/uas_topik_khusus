# Phase 4 — Task 5: Modul Rating & Feedback

> **Phase:** 4 — Assignment, Comment, Attachment, Notification  
> **Estimasi:** Hari ke-4  
> **Prioritas:** 🟢 Medium  
> **Referensi PRD:** Bagian 7.7 (FR-CLOSE-02), Bagian 15.7

---

## Deskripsi

Implementasi fitur rating dan feedback yang diberikan Employee setelah tiket di-close.

---

## Sub-Tasks

### 5.1 DTO

- [ ] Buat `CreateRatingDto`:
  - `score` — int, wajib, min 1, max 5 (`@IsInt()`, `@Min(1)`, `@Max(5)`)
  - `feedback` — string, opsional, max 1000 karakter

### 5.2 Submit Rating — `POST /api/v1/tickets/:id/rating`

- [ ] Role: `@Roles('EMPLOYEE')`
- [ ] Buat `SubmitRatingCommand` handler:
  1. Cari tiket by ID
  2. Validasi ownership (`createdById === currentUser.id`)
  3. Validasi status tiket sudah `RESOLVED` atau `CLOSED`
  4. Validasi belum ada rating untuk tiket ini (1 tiket = 1 rating)
  5. Simpan rating
  6. Return data rating
- [ ] Error handling:
  - Tiket bukan milik user → HTTP 403
  - Status belum RESOLVED → HTTP 422
  - Rating sudah ada → HTTP 409 Conflict

### 5.3 Get Rating per Ticket

- [ ] Rating sudah included di response `GET /api/v1/tickets/:id`
- [ ] Pastikan hanya tampil jika sudah ada rating

### 5.4 Get Technician Ratings

- [ ] Buat query untuk menampilkan statistik rating per technician:
  - Rata-rata score
  - Total rating
  - Distribusi score (berapa banyak score 1, 2, 3, 4, 5)
- [ ] Endpoint ini akan digunakan di Dashboard (Phase 5)

---

## Definition of Done

- [ ] Employee bisa submit rating (1-5) + feedback setelah tiket RESOLVED/CLOSED
- [ ] 1 tiket hanya boleh 1 rating (unique constraint)
- [ ] Statistik rating per technician bisa di-query
- [ ] Swagger docs lengkap
- [ ] Unit test: submit rating, duplicate prevention, score validation
