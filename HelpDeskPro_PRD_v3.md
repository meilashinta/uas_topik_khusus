# Product Requirements Document (PRD)
# HelpDeskPro — Enterprise IT Helpdesk Management System

## Document Control

| Item | Value |
|---|---|
| Nama Proyek | HelpDeskPro |
| Versi Dokumen | 2.0 (Revisi Lengkap) |
| Tanggal Revisi | 10 Juli 2026 |
| Jenis Dokumen | Product Requirements Document (PRD) |
| Status | Draft — Siap Review |
| Platform | Web (Responsive) |
| Metode Pengembangan | Agentic AI Software Development |
| Arsitektur | Modular Monolith (CQRS Ready) |
| Backend | NestJS (Node.js, TypeScript) |
| Frontend | Next.js (React, TypeScript) |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| Autentikasi | JWT (Access + Refresh Token) |
| Cache | Redis |
| Message Broker | RabbitMQ |
| Deployment | Docker / Docker Compose — lihat Bagian 18 |
| API Style | REST (JSON), OpenAPI 3.0 |
| Logging | Structured JSON Logging (Pino/Winston) |

### Revision History

| Versi | Tanggal | Perubahan | Penulis |
|---|---|---|---|
| 1.0 | — | Draft awal PRD | Tim Produk |
| 2.0 | 10 Jul 2026 | Penambahan ERD, API spec, RBAC matrix, SLA rules, NFR detail, testing & deployment plan | Revisi |
| 3.0 | 11 Jul 2026 | Menghapus dependensi Docker/Docker Compose; deployment diganti dengan pendekatan manual/cloud service (Supabase, Upstash, CloudAMQP) untuk development, dan opsi native process manager (PM2/systemd) untuk production | Revisi |
| 4.0 | 14 Jul 2026 | Mengubah deployment menjadi menggunakan Docker dan Docker Compose | Revisi |

---

# 1. Product Vision

HelpDeskPro adalah aplikasi manajemen layanan IT berbasis web yang membantu organisasi mengelola siklus hidup permintaan bantuan (ticket) secara end-to-end — mulai dari pembuatan tiket oleh karyawan, penugasan teknisi oleh supervisor, proses penanganan dan dokumentasi penyelesaian, hingga pelaporan performa dan kepatuhan SLA.

Visi produk: **menjadi sistem tunggal (single source of truth) untuk seluruh permintaan layanan IT internal**, menggantikan kanal informal (WhatsApp, email, tatap muka langsung) dengan alur kerja yang terstruktur, terukur, dan dapat diaudit.

Pengembangan dilakukan dengan pendekatan **Agentic AI Software Development**, di mana AI Agent berperan dalam analisis kebutuhan, perancangan (ERD, API spec, UML), implementasi kode, pengujian otomatis, dan penyusunan dokumentasi teknis — dengan dokumen ini sebagai **satu-satunya sumber kebenaran (single source of truth)** bagi seluruh artefak turunan.

---

# 2. Background & Problem Statement

Banyak organisasi masih menangani permintaan bantuan IT melalui kanal informal seperti WhatsApp, email, atau komunikasi langsung, yang menimbulkan masalah berikut:

| Masalah | Dampak |
|---|---|
| Tidak ada kanal terpusat | Permintaan tersebar, mudah terlewat atau hilang |
| Tidak ada histori tercatat | Sulit melacak siapa melakukan apa dan kapan |
| Tidak ada SLA terukur | Tidak diketahui apakah penanganan tepat waktu |
| Tidak ada evaluasi performa teknisi | Beban kerja tidak merata, kualitas layanan tidak terukur |
| Tidak ada laporan manajemen | Manajemen kesulitan mengambil keputusan berbasis data |
| Tidak ada kontrol akses | Siapa saja bisa mengakses informasi sensitif tanpa batasan peran |

HelpDeskPro hadir sebagai solusi terpusat yang mengatasi keenam masalah di atas melalui sistem tiket berbasis workflow, RBAC, SLA monitoring otomatis, dan dashboard pelaporan real-time.

---

# 3. Objectives

## 3.1 Business Objectives

| # | Objective | Indikator Keberhasilan (KPI) |
|---|---|---|
| B1 | Mempermudah pelaporan masalah IT | Rata-rata waktu pembuatan tiket < 2 menit |
| B2 | Mempercepat proses penanganan | Rata-rata waktu respon pertama sesuai SLA per prioritas |
| B3 | Memudahkan monitoring pekerjaan teknisi | 100% tiket memiliki status & penanggung jawab yang jelas |
| B4 | Menyediakan laporan performa | Dashboard menampilkan data real-time dengan delay < 5 detik |
| B5 | Meningkatkan kepuasan pengguna | Rating rata-rata penyelesaian tiket ≥ 4.0/5.0 |

## 3.2 Technical Objectives

- REST API dengan dokumentasi OpenAPI 3.0
- JWT Authentication (access token 15 menit, refresh token 7 hari)
- CQRS Pattern (pemisahan command & query handler)
- Event-driven processing dengan RabbitMQ
- Redis Cache untuk data yang sering diakses (dashboard, sesi)
- Deployment menggunakan kontainer: service, database, cache, dan message broker dijalankan menggunakan Docker dan Docker Compose
- Audit Trail lengkap untuk seluruh aksi yang mengubah data
- Automated testing (unit, integration, e2e) dengan target code coverage ≥ 70%

---

# 4. Target Users & Personas

## 4.1 Employee (Pemohon)

**Persona:** Karyawan non-IT yang mengalami kendala teknis dan butuh bantuan cepat.

Hak akses:
- Register & Login
- Membuat Ticket
- Upload Lampiran (screenshot, dokumen pendukung)
- Melihat Status & Histori Ticket miliknya
- Memberikan Komentar pada tiket miliknya
- Memberikan Rating & Feedback setelah tiket selesai
- Membatalkan tiket yang belum di-assign

## 4.2 Technician (Teknisi)

**Persona:** Staf IT yang menangani penyelesaian tiket teknis.

Hak akses:
- Melihat daftar Ticket yang di-assign kepadanya
- Update Status Ticket (mengikuti alur workflow yang sah)
- Menambahkan Catatan Internal (tidak terlihat oleh Employee) & Catatan Publik
- Upload Bukti Penyelesaian
- Melihat riwayat tiket serupa (opsional, untuk referensi)

## 4.3 Supervisor

**Persona:** Koordinator tim IT yang mengelola penugasan dan memantau kinerja.

Hak akses:
- Dashboard tim (beban kerja per teknisi, tiket overdue)
- Assign & Reassign Teknisi
- Monitoring SLA & eskalasi tiket yang mendekati/melewati batas waktu
- Approve/Reject penutupan tiket bila diperlukan
- Mengakses Reports (harian, mingguan, bulanan)

## 4.4 Administrator

**Persona:** Pengelola sistem yang mengatur konfigurasi dasar.

Hak akses:
- User Management (CRUD user, reset password, non-aktifkan akun)
- Department Management
- Category Management
- Priority & SLA Management
- Role & Permission Management
- Melihat Audit Log sistem secara penuh


## 4.5 Role–Permission Matrix (RBAC)

| Modul / Aksi | Employee | Technician | Supervisor | Administrator |
|---|---|---|---|---|
| Register/Login | ✅ | ✅ | ✅ | ✅ |
| Buat Ticket | ✅ | ❌ | ❌ | ❌ |
| Lihat Ticket Sendiri | ✅ | — | — | — |
| Lihat Semua Ticket | ❌ | ❌ (hanya assign-nya) | ✅ | ✅ |
| Batalkan Ticket (status OPEN) | ✅ (miliknya) | ❌ | ✅ | ✅ |
| Assign/Reassign Teknisi | ❌ | ❌ | ✅ | ✅ |
| Update Status Ticket | ❌ | ✅ (assign-nya) | ✅ | ✅ |
| Tambah Catatan Internal | ❌ | ✅ | ✅ | ✅ |
| Tambah Komentar Publik | ✅ | ✅ | ✅ | ✅ |
| Upload Lampiran | ✅ | ✅ | ✅ | ✅ |
| Beri Rating | ✅ (miliknya, setelah RESOLVED) | ❌ | ❌ | ❌ |
| Lihat Dashboard | ❌ | ❌ (dashboard pribadi) | ✅ | ✅ |
| Lihat Reports | ❌ | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ❌ | ✅ |
| Department/Category/Priority Mgmt | ❌ | ❌ | ❌ | ✅ |
| Role Management | ❌ | ❌ | ❌ | ✅ |
| Lihat Audit Log | ❌ | ❌ | ❌ (log timnya saja, opsional) | ✅ |

> Catatan implementasi: gunakan **Guard berbasis Role + Policy (ownership check)** di NestJS (mis. `@Roles('EMPLOYEE')` dikombinasikan dengan pengecekan `ticket.createdById === currentUser.id`) agar Employee/Technician hanya bisa mengakses data miliknya sendiri.

---

# 5. Scope

## 5.1 In Scope

- Authentication & Authorization (JWT, RBAC)
- User Management
- Department Management
- Ticket Category Management
- Priority & SLA Management
- Ticket Management (CRUD + workflow)
- Assignment Management
- Comment (publik & internal)
- Attachment (upload/download file)
- Notification (in-app, email)
- Dashboard (per role)
- Reports (export PDF/Excel)
- Audit Trail
- Rating & Feedback

## 5.2 Out of Scope (Fase 1)

- Live Chat real-time
- Video Call
- AI Chatbot / auto-triage berbasis NLP
- Aplikasi Mobile native (hanya web responsive)
- SMS Gateway
- Integrasi Single Sign-On (SSO) pihak ketiga (mis. Google Workspace, Azure AD) — dicadangkan untuk Fase 2
- Multi-tenant / multi-organisasi dalam satu instance

## 5.3 Asumsi & Batasan (Assumptions & Constraints)

- Sistem digunakan secara internal (intranet/VPN) atau melalui domain perusahaan; tidak untuk publik umum.
- Satu pengguna hanya memiliki satu Role aktif dalam satu waktu.
- Bahasa antarmuka: Bahasa Indonesia (default), dengan struktur data yang mendukung penambahan i18n di masa depan.
- Zona waktu default: WIB (UTC+7); seluruh timestamp disimpan dalam UTC di database dan dikonversi di frontend.
- Ukuran maksimum lampiran per file: 10 MB; maksimum 5 lampiran per tiket.

---

# 6. Glossary

| Istilah | Definisi |
|---|---|
| Ticket | Catatan permintaan bantuan IT yang dibuat oleh Employee |
| SLA (Service Level Agreement) | Batas waktu maksimum penanganan tiket berdasarkan prioritas |
| First Response Time (FRT) | Waktu dari tiket dibuat hingga pertama kali direspons/di-assign |
| Resolution Time | Waktu dari tiket di-assign hingga berstatus RESOLVED |
| Escalation | Proses menaikkan prioritas/pemberitahuan ketika tiket mendekati/melewati SLA |
| CQRS | Command Query Responsibility Segregation — memisahkan operasi tulis (command) dan baca (query) |
| RBAC | Role-Based Access Control |
| Audit Trail | Catatan historis seluruh perubahan data penting untuk keperluan akuntabilitas |

---

# 7. Functional Requirements (Detail)

Setiap requirement diberi kode unik (FR-xxx) agar dapat ditelusuri (traceable) ke use case, API endpoint, dan test case terkait.

## 7.1 Authentication (FR-AUTH)

| Kode | Requirement | Validasi / Aturan Bisnis |
|---|---|---|
| FR-AUTH-01 | Register | Email unik, format email valid, password minimal 8 karakter (kombinasi huruf & angka), field wajib: nama, email, password, department |
| FR-AUTH-02 | Login | Maksimum 5 kali percobaan gagal → akun terkunci sementara 15 menit (rate limiting via Redis) |
| FR-AUTH-03 | Logout | Refresh token di-blacklist (disimpan di Redis dengan TTL sesuai sisa masa berlaku) |
| FR-AUTH-04 | Refresh Token | Access token berlaku 15 menit, refresh token 7 hari; refresh token rotation setiap kali digunakan |
| FR-AUTH-05 | Forgot/Reset Password | Kirim link reset via email, token berlaku 30 menit, sekali pakai |
| FR-AUTH-06 | Change Password | Wajib memasukkan password lama; password baru tidak boleh sama dengan 3 password terakhir |

## 7.2 User Management (FR-USER)

| Kode | Requirement |
|---|---|
| FR-USER-01 | Admin dapat membuat, mengubah, menonaktifkan (soft delete) user |
| FR-USER-02 | Admin dapat mengubah role user |
| FR-USER-03 | Admin dapat mereset password user lain (mengirim email set-password baru) |
| FR-USER-04 | User dapat mengubah profil sendiri (nama, foto, nomor telepon) namun tidak bisa mengubah role/email tanpa approval admin |

## 7.3 Department, Category, Priority Management (FR-MASTER)

| Kode | Requirement |
|---|---|
| FR-MASTER-01 | Admin dapat CRUD Department (nama, kode, status aktif) |
| FR-MASTER-02 | Admin dapat CRUD Ticket Category (nama, deskripsi, department terkait) |
| FR-MASTER-03 | Admin dapat CRUD Priority beserta SLA (mis. Critical = 4 jam, High = 8 jam, Medium = 24 jam, Low = 72 jam) — lihat Bagian 11 |
| FR-MASTER-04 | Data master yang sudah dipakai di tiket aktif tidak boleh dihapus permanen, hanya dinonaktifkan |

## 7.4 Ticket Management (FR-TICKET)

| Kode | Requirement |
|---|---|
| FR-TICKET-01 | Create Ticket: wajib judul, deskripsi, category, priority; lampiran opsional |
| FR-TICKET-02 | Sistem otomatis menghasilkan nomor tiket unik dengan format `TKT-YYYYMMDD-XXXX` |
| FR-TICKET-03 | Update Ticket: hanya field judul/deskripsi/lampiran yang dapat diubah oleh Employee, hanya selama status = OPEN |
| FR-TICKET-04 | Cancel Ticket: hanya bisa dilakukan Employee pemilik tiket selama status = OPEN (belum di-assign) |
| FR-TICKET-05 | View Ticket: menampilkan detail, histori status, komentar, lampiran |
| FR-TICKET-06 | View History: seluruh perubahan status & assignment tercatat dengan timestamp dan aktor |
| FR-TICKET-07 | Setiap perubahan status tiket wajib mengikuti alur workflow yang sah (lihat Bagian 9); perubahan status ilegal (mis. OPEN → CLOSED langsung) ditolak sistem dengan HTTP 422 |

## 7.5 Assignment Management (FR-ASSIGN)

| Kode | Requirement |
|---|---|
| FR-ASSIGN-01 | Supervisor menugaskan satu Technician per tiket |
| FR-ASSIGN-02 | Reassign dapat dilakukan kapan saja sebelum status RESOLVED, dengan wajib mengisi alasan reassign |
| FR-ASSIGN-03 | Sistem mencatat beban kerja aktif (jumlah tiket open) per teknisi untuk membantu keputusan assign |

## 7.6 Progress & Documentation (FR-PROGRESS)

| Kode | Requirement |
|---|---|
| FR-PROGRESS-01 | Technician mengubah status: ASSIGNED → IN_PROGRESS → RESOLVED |
| FR-PROGRESS-02 | Setiap perubahan status RESOLVED wajib disertai catatan penyelesaian & minimal 1 bukti (lampiran/foto/dokumen) |
| FR-PROGRESS-03 | Internal Note hanya terlihat oleh Technician, Supervisor, Administrator |
| FR-PROGRESS-04 | Public Comment terlihat oleh seluruh pihak terkait tiket tersebut |

## 7.7 Verification & Closing (FR-CLOSE)

| Kode | Requirement |
|---|---|
| FR-CLOSE-01 | Setelah status RESOLVED, Employee memiliki waktu 3x24 jam untuk verifikasi |
| FR-CLOSE-02 | Jika Employee menyetujui → status CLOSED, dan wajib mengisi rating (1-5) & feedback opsional |
| FR-CLOSE-03 | Jika Employee menolak (reopen) → status kembali ke IN_PROGRESS, wajib mengisi alasan penolakan |
| FR-CLOSE-04 | Jika tidak ada respons Employee dalam 3x24 jam → sistem otomatis mengubah status menjadi CLOSED (auto-close) via scheduled job |

## 7.8 Rejection (FR-REJECT)

| Kode | Requirement |
|---|---|
| FR-REJECT-01 | Supervisor dapat menolak tiket dari status OPEN dengan alasan wajib diisi (mis. bukan lingkup IT, duplikat) |
| FR-REJECT-02 | Tiket REJECTED tidak dapat diproses lebih lanjut namun tetap tersimpan untuk audit |

## 7.9 Notification (FR-NOTIF)

| Kode | Requirement |
|---|---|
| FR-NOTIF-01 | Notifikasi in-app + email dikirim pada event: TicketCreated, TicketAssigned, TicketStatusChanged, TicketResolved, TicketClosed, TicketRejected, SLA Warning, SLA Breach |
| FR-NOTIF-02 | User dapat menandai notifikasi sebagai sudah dibaca |
| FR-NOTIF-03 | Preferensi notifikasi (email on/off) dapat diatur per user |

## 7.10 Dashboard (FR-DASH)

| Kode | Requirement |
|---|---|
| FR-DASH-01 | Total Ticket, Open, In Progress, Resolved, Closed, Rejected (per periode) |
| FR-DASH-02 | SLA Compliance Rate (% tiket selesai dalam SLA) |
| FR-DASH-03 | Technician Performance (jumlah tiket selesai, rata-rata waktu penyelesaian, rating rata-rata) |
| FR-DASH-04 | Grafik tren tiket per hari/minggu/bulan |
| FR-DASH-05 | Data dashboard di-cache di Redis dengan TTL 60 detik, invalidasi otomatis saat ada event terkait |

## 7.11 Reports (FR-REPORT)

| Kode | Requirement |
|---|---|
| FR-REPORT-01 | Laporan dapat difilter berdasarkan rentang tanggal, department, category, priority, technician |
| FR-REPORT-02 | Export laporan ke format PDF dan Excel (.xlsx) |
| FR-REPORT-03 | Laporan performa teknisi individual dan tim |

---

# 8. Use Cases & Acceptance Criteria (Contoh Representatif)

## UC-01: Employee Membuat Tiket

**Aktor:** Employee
**Precondition:** User sudah login dengan role EMPLOYEE

**Main Flow:**
1. Employee membuka form "Buat Tiket Baru"
2. Mengisi judul, deskripsi, memilih category dan priority
3. (Opsional) Mengunggah lampiran
4. Submit

**Acceptance Criteria:**
- ✅ Tiket tersimpan dengan status `OPEN` dan nomor tiket unik `TKT-YYYYMMDD-XXXX`
- ✅ Event `TicketCreated` terkirim ke RabbitMQ
- ✅ Supervisor terkait department menerima notifikasi
- ❌ Submit ditolak (HTTP 400) jika judul/deskripsi/category/priority kosong
- ❌ Submit ditolak (HTTP 413) jika lampiran > 10MB atau lebih dari 5 file

## UC-02: Supervisor Assign Teknisi

**Aktor:** Supervisor
**Precondition:** Tiket berstatus `OPEN`

**Main Flow:**
1. Supervisor membuka daftar tiket OPEN
2. Memilih tiket, memilih teknisi dari daftar (menampilkan beban kerja aktif tiap teknisi)
3. Konfirmasi assign

**Acceptance Criteria:**
- ✅ Status tiket berubah menjadi `ASSIGNED`
- ✅ Event `TicketAssigned` terkirim, teknisi menerima notifikasi
- ✅ Timer SLA (First Response Time) berhenti dan tercatat
- ❌ Assign ditolak jika tiket sudah berstatus selain `OPEN`

## UC-03: Teknisi Menyelesaikan Tiket

**Aktor:** Technician
**Precondition:** Tiket berstatus `IN_PROGRESS` dan di-assign ke teknisi tsb.

**Main Flow:**
1. Teknisi mengubah status menjadi `RESOLVED`
2. Mengisi catatan penyelesaian dan mengunggah bukti

**Acceptance Criteria:**
- ✅ Status berubah menjadi `RESOLVED` hanya jika catatan & minimal 1 bukti terlampir
- ✅ Event `TicketResolved` terkirim; Employee menerima notifikasi untuk verifikasi
- ✅ Timer verifikasi 3x24 jam mulai berjalan (dikelola scheduled job)

## UC-04: Employee Verifikasi Penyelesaian

**Aktor:** Employee
**Precondition:** Tiket berstatus `RESOLVED` dan Employee adalah pemilik tiket

**Main Flow (Approve):**
1. Employee membuka tiket, menekan "Setujui & Tutup"
2. Mengisi rating (1-5) dan feedback opsional

**Main Flow (Reject):**
1. Employee menekan "Tolak/Buka Kembali"
2. Mengisi alasan penolakan wajib

**Acceptance Criteria:**
- ✅ Approve → status `CLOSED`, rating tersimpan, event `TicketClosed` terkirim
- ✅ Reject → status kembali `IN_PROGRESS`, teknisi menerima notifikasi beserta alasan
- ✅ Jika tidak ada aksi dalam 3x24 jam → job terjadwal otomatis set status `CLOSED` dengan catatan sistem "auto-closed"

---

# 9. Ticket Workflow (State Machine)

```text
                 ┌───────────┐
                 │   OPEN    │◄── Employee membuat tiket
                 └─────┬─────┘
                       │ Supervisor assign
                       ▼
                 ┌───────────┐        Supervisor tolak
                 │ ASSIGNED  ├───────────────────────────► REJECTED
                 └─────┬─────┘
                       │ Teknisi mulai kerjakan
                       ▼
                 ┌───────────┐
                 │IN_PROGRESS│◄─────────────┐
                 └─────┬─────┘              │ Employee reject/reopen
                       │ Teknisi selesai     │ (wajib alasan)
                       ▼                    │
                 ┌───────────┐              │
                 │ RESOLVED  ├──────────────┘
                 └─────┬─────┘
                       │ Employee approve
                       │ ATAU auto-close (3x24 jam tanpa respons)
                       ▼
                 ┌───────────┐
                 │  CLOSED   │  (status akhir, tidak bisa diubah lagi)
                 └───────────┘
```

## 9.1 Matriks Transisi Status yang Sah

| Dari → Ke | OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED | REJECTED |
|---|---|---|---|---|---|---|
| **OPEN** | — | ✅ (Supervisor) | ❌ | ❌ | ❌ | ✅ (Supervisor) |
| **ASSIGNED** | ❌ | — | ✅ (Technician) | ❌ | ❌ | ❌ |
| **IN_PROGRESS** | ❌ | ✅ (Reassign, Supervisor) | — | ✅ (Technician) | ❌ | ❌ |
| **RESOLVED** | ❌ | ❌ | ✅ (Employee reject) | — | ✅ (Employee approve / auto-close) | ❌ |
| **CLOSED** | ❌ | ❌ | ❌ | ❌ | — (final) | ❌ |
| **REJECTED** | ❌ | ❌ | ❌ | ❌ | ❌ | — (final) |

> Transisi di luar tabel di atas **wajib ditolak API** dengan HTTP 422 Unprocessable Entity dan pesan error yang jelas.

---

# 10. Data Model / Entity Relationship Diagram (ERD)

## 10.1 Diagram Relasi (Ringkas)

```text
User ─────< Ticket >───── TicketCategory
  │            │
  │            ├──< TicketAttachment
  │            ├──< TicketComment
  │            ├──< TicketHistory
  │            ├──< Assignment >── User (technician)
  │            └──< Rating
  │
  ├──< Role (many-to-many via UserRole, atau 1 role per user)
  ├──< Department
  ├──< Notification
  └──< ActivityLog

TicketPriority ─────< Ticket
```

## 10.2 Detail Entitas

### User
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| name | String | |
| email | String (unique) | |
| passwordHash | String | BCrypt, cost factor ≥ 10 |
| roleId | UUID (FK → Role) | |
| departmentId | UUID (FK → Department) | |
| phone | String | nullable |
| avatarUrl | String | nullable |
| isActive | Boolean | default true |
| createdAt / updatedAt | DateTime | |

### Role
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| name | Enum: EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMINISTRATOR | |
| description | String | |

### Department
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| name | String |
| code | String (unique) |
| isActive | Boolean |

### TicketCategory
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| name | String |
| description | String |
| departmentId | UUID (FK, nullable) |
| isActive | Boolean |

### TicketPriority
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| name | Enum: CRITICAL, HIGH, MEDIUM, LOW | |
| slaResponseMinutes | Int | batas waktu first response |
| slaResolutionMinutes | Int | batas waktu resolusi |

### Ticket
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| ticketNumber | String (unique) | format `TKT-YYYYMMDD-XXXX` |
| title | String | |
| description | Text | |
| categoryId | UUID (FK) | |
| priorityId | UUID (FK) | |
| status | Enum: OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REJECTED | |
| createdById | UUID (FK → User) | Employee pembuat |
| slaDueAt | DateTime | dihitung dari priority saat assign |
| resolvedAt | DateTime | nullable |
| closedAt | DateTime | nullable |
| createdAt / updatedAt | DateTime | |

### Assignment
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| ticketId | UUID (FK) |
| technicianId | UUID (FK → User) |
| assignedById | UUID (FK → User, Supervisor) |
| reason | String (nullable, wajib jika reassign) |
| assignedAt | DateTime |
| isActive | Boolean (hanya 1 assignment aktif per tiket) |

### TicketComment
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| ticketId | UUID (FK) |
| userId | UUID (FK) |
| content | Text |
| isInternal | Boolean |
| createdAt | DateTime |

### TicketAttachment
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| ticketId | UUID (FK) |
| uploadedById | UUID (FK) |
| fileName | String |
| fileUrl | String |
| fileSize | Int (bytes, max 10MB) |
| mimeType | String |
| createdAt | DateTime |

### TicketHistory
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| ticketId | UUID (FK) | |
| fromStatus | String (nullable) | |
| toStatus | String | |
| changedById | UUID (FK) | |
| note | String (nullable) | |
| createdAt | DateTime | |

### Notification
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| userId | UUID (FK) |
| type | String (mis. TICKET_ASSIGNED, SLA_WARNING) |
| title | String |
| message | String |
| isRead | Boolean |
| createdAt | DateTime |

### ActivityLog (Audit Trail)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| userId | UUID (FK, nullable) | nullable untuk aksi sistem |
| action | String | mis. `TICKET_CREATED`, `USER_ROLE_CHANGED` |
| entityType | String | |
| entityId | UUID | |
| metadata | JSONB | payload perubahan (before/after) |
| ipAddress | String | |
| createdAt | DateTime | |

### Rating
| Field | Tipe |
|---|---|
| id | UUID (PK) |
| ticketId | UUID (FK, unique) |
| ratedById | UUID (FK) |
| score | Int (1-5) |
| feedback | Text (nullable) |
| createdAt | DateTime |

> Seluruh tabel disarankan memiliki index pada foreign key dan pada kolom yang sering difilter (`status`, `priorityId`, `departmentId`, `createdAt`) untuk menjaga performa query di bawah 300ms.

---

# 11. SLA Rules (Priority & Escalation)

| Priority | First Response Time (FRT) | Resolution Time | Contoh Kasus |
|---|---|---|---|
| CRITICAL | 30 menit | 4 jam | Sistem produksi down, seluruh kantor tidak bisa akses jaringan |
| HIGH | 1 jam | 8 jam | Aplikasi bisnis utama error, satu departemen terdampak |
| MEDIUM | 4 jam | 24 jam | Perangkat individu bermasalah, ada workaround |
| LOW | 8 jam | 72 jam | Permintaan instalasi software non-kritis |

## 11.1 Aturan Eskalasi Otomatis

- **SLA Warning**: notifikasi otomatis dikirim ke Supervisor ketika sisa waktu SLA ≤ 20%.
- **SLA Breach**: jika `slaDueAt` terlampaui dan tiket belum RESOLVED, sistem menandai tiket sebagai `isOverdue = true`, mengirim notifikasi eskalasi ke Supervisor & Administrator, dan mencatatnya di laporan SLA compliance.
- Perhitungan SLA **berhenti sementara (paused)** apabila tiket menunggu klarifikasi dari Employee (status khusus opsional `PENDING_INFO`, dapat ditambahkan pada iterasi berikutnya bila diperlukan).
- Job scheduler (cron via RabbitMQ delayed message atau NestJS `@Cron`) mengecek SLA setiap 5 menit.

---

# 12. Architecture Requirements

## 12.1 CQRS

### Command (menulis / mengubah state)
- CreateTicketCommand
- UpdateTicketCommand
- AssignTechnicianCommand
- ReassignTechnicianCommand
- UpdateTicketStatusCommand
- AddCommentCommand
- CloseTicketCommand
- RejectTicketCommand
- SubmitRatingCommand

### Query (membaca, tidak mengubah state)
- GetTicketDetailQuery
- GetTicketListQuery (dengan filter, pagination, sorting)
- GetDashboardSummaryQuery
- GetTechnicianPerformanceQuery
- GetSlaComplianceReportQuery
- SearchTicketQuery (full-text search pada judul/deskripsi)

## 12.2 Prinsip Implementasi

- Command Handler hanya boleh memvalidasi & menulis ke database, lalu mem-publish domain event ke RabbitMQ; tidak melakukan query kompleks.
- Query Handler membaca dari read model (bisa tabel yang sama untuk fase 1, atau read-replica/materialized view untuk fase lanjutan) dan memanfaatkan Redis cache.
- Setiap Command dan Query diekspos melalui satu Controller REST per modul, namun secara internal dipisah ke Handler masing-masing (pola CQRS ringan, bukan full Event Sourcing).

## 12.3 Struktur Modul (NestJS, disarankan)

```text
src/
 ├── modules/
 │    ├── auth/
 │    ├── users/
 │    ├── departments/
 │    ├── categories/
 │    ├── priorities/
 │    ├── tickets/
 │    │    ├── commands/
 │    │    ├── queries/
 │    │    ├── events/
 │    │    └── tickets.controller.ts
 │    ├── assignments/
 │    ├── comments/
 │    ├── attachments/
 │    ├── notifications/
 │    ├── dashboard/
 │    ├── reports/
 │    └── audit-log/
 ├── common/ (guards, interceptors, filters, decorators)
 ├── config/
 └── main.ts
```

---

# 13. RabbitMQ — Event & Worker Design

## 13.1 Exchange & Queue

| Exchange | Tipe | Routing Key | Queue Konsumen |
|---|---|---|---|
| `ticket.events` | topic | `ticket.created` | `notification-worker`, `analytics-worker` |
| `ticket.events` | topic | `ticket.assigned` | `notification-worker`, `activity-worker` |
| `ticket.events` | topic | `ticket.status_changed` | `notification-worker`, `activity-worker`, `analytics-worker` |
| `ticket.events` | topic | `ticket.resolved` | `notification-worker`, `activity-worker` |
| `ticket.events` | topic | `ticket.closed` | `notification-worker`, `analytics-worker` |
| `ticket.events` | topic | `ticket.rejected` | `notification-worker`, `activity-worker` |
| `sla.events` | topic | `sla.warning`, `sla.breach` | `notification-worker`, `analytics-worker` |

## 13.2 Contoh Payload Event

```json
{
  "eventType": "TicketAssigned",
  "ticketId": "uuid",
  "ticketNumber": "TKT-20260710-0001",
  "assignedTo": "uuid-technician",
  "assignedBy": "uuid-supervisor",
  "priority": "HIGH",
  "slaDueAt": "2026-07-10T18:00:00Z",
  "timestamp": "2026-07-10T10:00:00Z"
}
```

## 13.3 Worker

| Worker | Tanggung Jawab |
|---|---|
| Assignment Worker | Memproses logika auto-suggestion teknisi berdasarkan beban kerja (opsional/fase 2) |
| Notification Worker | Mengirim notifikasi in-app & email berdasarkan event yang diterima |
| Activity Worker | Menulis entri ke `TicketHistory` dan `ActivityLog` |
| Analytics Worker | Memperbarui agregat statistik untuk Dashboard & Reports, invalidasi cache Redis terkait |

## 13.4 Keandalan Pesan

- Gunakan **manual ACK**; pesan yang gagal diproses masuk ke **Dead Letter Queue (DLQ)** setelah 3x retry dengan exponential backoff.
- Idempotency: setiap consumer memeriksa `eventId` (UUID) agar event yang terkirim ulang tidak diproses dua kali.

---

# 14. Redis — Cache Strategy

| Key Pattern | Isi | TTL | Invalidasi |
|---|---|---|---|
| `dashboard:summary:{role}:{userId}` | Ringkasan dashboard per role | 60 detik | Saat ada event ticket status berubah |
| `ticket:open:count` | Jumlah tiket open | 60 detik | Event `ticket.created`, `ticket.assigned` |
| `ticket:closed:count` | Jumlah tiket closed | 60 detik | Event `ticket.closed` |
| `ticket:{id}` | Detail tiket (read cache) | 30 detik | Event apa pun terkait tiket tsb |
| `user:{id}` | Profil user | 5 menit | Event `user.updated` |
| `session:{userId}` | Data sesi/refresh token aktif | Sesuai masa berlaku refresh token | Logout / rotasi token |
| `ratelimit:login:{email}` | Counter percobaan login gagal | 15 menit | Login berhasil atau TTL habis |
| `sla:overdue:list` | Daftar tiket overdue (untuk dashboard supervisor) | 5 menit | Job SLA checker setiap 5 menit |

> Strategi: **cache-aside pattern** — baca dari cache dulu, jika miss baca dari DB lalu isi cache. Invalidasi dilakukan oleh Analytics/Activity Worker saat menerima event terkait, bukan mengandalkan TTL saja, agar data dashboard tetap real-time.

---

# 15. API Specification (Ringkasan Endpoint per Modul)

> Spesifikasi lengkap (request/response schema, error codes) dituangkan dalam dokumen terpisah `openapi.yaml`, namun berikut adalah daftar endpoint minimum yang wajib tersedia.

## 15.1 Authentication Module
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/v1/auth/register` | Registrasi akun baru |
| POST | `/api/v1/auth/login` | Login, mengembalikan access & refresh token |
| POST | `/api/v1/auth/refresh` | Perbarui access token |
| POST | `/api/v1/auth/logout` | Logout, blacklist refresh token |
| POST | `/api/v1/auth/forgot-password` | Kirim email reset password |
| POST | `/api/v1/auth/reset-password` | Set password baru dengan token |

## 15.2 User Module
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/v1/users` | List user (Admin, dengan filter & pagination) |
| GET | `/api/v1/users/:id` | Detail user |
| POST | `/api/v1/users` | Buat user (Admin) |
| PATCH | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Nonaktifkan user (soft delete) |
| PATCH | `/api/v1/users/me` | Update profil sendiri |

## 15.3 Master Data (Department / Category / Priority)
| Method | Endpoint |
|---|---|
| GET/POST | `/api/v1/departments` |
| PATCH/DELETE | `/api/v1/departments/:id` |
| GET/POST | `/api/v1/categories` |
| PATCH/DELETE | `/api/v1/categories/:id` |
| GET/POST | `/api/v1/priorities` |
| PATCH/DELETE | `/api/v1/priorities/:id` |

## 15.4 Ticket Module
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/v1/tickets` | Buat tiket baru |
| GET | `/api/v1/tickets` | List tiket (filter: status, priority, category, department, date range, search) |
| GET | `/api/v1/tickets/:id` | Detail tiket |
| PATCH | `/api/v1/tickets/:id` | Update judul/deskripsi (hanya status OPEN) |
| PATCH | `/api/v1/tickets/:id/cancel` | Batalkan tiket |
| PATCH | `/api/v1/tickets/:id/status` | Ubah status (mengikuti state machine) |
| PATCH | `/api/v1/tickets/:id/reject` | Tolak tiket (Supervisor) |
| PATCH | `/api/v1/tickets/:id/close` | Approve & tutup tiket (Employee) |
| PATCH | `/api/v1/tickets/:id/reopen` | Tolak penyelesaian / buka kembali |
| GET | `/api/v1/tickets/:id/history` | Riwayat status tiket |

## 15.5 Assignment Module
| Method | Endpoint |
|---|---|
| POST | `/api/v1/tickets/:id/assign` |
| POST | `/api/v1/tickets/:id/reassign` |

## 15.6 Comment & Attachment Module
| Method | Endpoint |
|---|---|
| POST | `/api/v1/tickets/:id/comments` |
| GET | `/api/v1/tickets/:id/comments` |
| POST | `/api/v1/tickets/:id/attachments` |
| GET | `/api/v1/tickets/:id/attachments/:attachmentId` (download) |
| DELETE | `/api/v1/tickets/:id/attachments/:attachmentId` |

## 15.7 Rating Module
| Method | Endpoint |
|---|---|
| POST | `/api/v1/tickets/:id/rating` |

## 15.8 Notification Module
| Method | Endpoint |
|---|---|
| GET | `/api/v1/notifications` |
| PATCH | `/api/v1/notifications/:id/read` |
| PATCH | `/api/v1/notifications/read-all` |

## 15.9 Dashboard & Report Module
| Method | Endpoint |
|---|---|
| GET | `/api/v1/dashboard/summary` |
| GET | `/api/v1/dashboard/sla-compliance` |
| GET | `/api/v1/dashboard/technician-performance` |
| GET | `/api/v1/reports/tickets?format=pdf\|xlsx` |
| GET | `/api/v1/reports/technician-performance?format=pdf\|xlsx` |

## 15.10 Standar Format Response

**Sukses:**
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "TICKET_INVALID_TRANSITION",
    "message": "Tiket tidak dapat diubah dari status RESOLVED ke OPEN",
    "details": []
  }
}
```

Konvensi HTTP status: `200` OK, `201` Created, `400` Bad Request (validasi), `401` Unauthorized, `403` Forbidden (RBAC), `404` Not Found, `409` Conflict, `422` Unprocessable Entity (transisi status ilegal), `429` Too Many Requests (rate limit), `500` Internal Server Error.

---

# 16. Non-Functional Requirements (NFR)

## 16.1 Performance
- Response time API rata-rata < 300ms untuk operasi baca (query), < 500ms untuk operasi tulis (command) pada beban normal (P95).
- Dashboard harus mampu menampilkan data untuk minimal 10.000 tiket tanpa penurunan performa signifikan (gunakan pagination & index database).

## 16.2 Security
- Password disimpan dengan **BCrypt** (cost factor ≥ 10), tidak pernah disimpan/dilog dalam bentuk plain text.
- **RBAC** diterapkan di level Guard (backend) — bukan hanya disembunyikan di UI.
- Seluruh endpoint (kecuali auth) wajib JWT valid; access token memuat `userId`, `role`, `exp`.
- **Rate limiting** pada endpoint login & forgot-password untuk mencegah brute force.
- Validasi input di seluruh endpoint menggunakan DTO + class-validator (NestJS) untuk mencegah injection.
- File upload divalidasi tipe MIME (whitelist: gambar, PDF, dokumen umum) dan ukuran maksimum untuk mencegah upload file berbahaya.
- HTTPS wajib di lingkungan produksi (TLS termination di reverse proxy/load balancer).
- Audit log mencatat aktor, aksi, waktu, dan IP address untuk seluruh aksi sensitif (login, perubahan role, penghapusan data).

## 16.3 Availability & Reliability
- Target uptime 99.5% (di luar maintenance terjadwal).
- Health check endpoint (`/health`, `/ready`) untuk setiap service agar mendukung monitoring uptime dan restart otomatis oleh process manager (mis. PM2, systemd, atau platform hosting seperti Railway/Render).
- RabbitMQ menggunakan durable queue & persistent message agar event tidak hilang saat service restart.

## 16.4 Scalability
- Arsitektur modular monolith dirancang agar setiap modul dapat diekstrak menjadi microservice terpisah di masa depan tanpa perubahan besar pada domain logic.
- Stateless API (session disimpan di Redis, bukan in-memory) agar mendukung horizontal scaling (multiple instance di belakang load balancer).

## 16.5 Maintainability & Code Quality
- Linting (ESLint) & formatting (Prettier) wajib lulus di CI sebelum merge.
- Unit test coverage minimal 70% untuk business logic (command/query handler).
- Dokumentasi API otomatis via Swagger/OpenAPI, ter-generate dari decorator NestJS.

## 16.6 Logging & Monitoring
- Structured logging (format JSON) dengan correlation ID per request untuk memudahkan tracing lintas service.
- Level log: `error`, `warn`, `info`, `debug`; log `error` wajib menyertakan stack trace di lingkungan non-produksi.
- (Opsional, fase lanjutan) Integrasi dengan Prometheus/Grafana untuk metrik, dan Sentry untuk error tracking.

## 16.7 Usability & Accessibility
- Desain responsive, mendukung resolusi desktop dan tablet minimum.
- Formulir wajib menampilkan pesan error inline yang jelas dan dalam Bahasa Indonesia.

## 16.8 Data Retention & Backup
- Backup database otomatis harian, retensi minimal 30 hari.
- Lampiran tiket disimpan di object storage (mis. MinIO/S3-compatible) dengan retensi mengikuti kebijakan perusahaan (default: selama tiket ada, minimal 1 tahun setelah closed).

---

# 17. Testing Strategy

| Jenis Test | Cakupan | Tooling (disarankan) |
|---|---|---|
| Unit Test | Command/Query handler, service, util function | Jest |
| Integration Test | Interaksi modul dengan database (Prisma) & Redis | Jest, dijalankan langsung terhadap database & Redis **test instance terpisah** (mis. project Supabase khusus testing / database schema terpisah, dan database Upstash Redis khusus testing) |
| E2E Test | Alur API penuh (login → buat tiket → assign → resolve → close) | Jest + Supertest |
| Contract Test | Validasi response API sesuai OpenAPI schema | Dredd / Pact (opsional) |
| Load Test | Simulasi beban pada endpoint kritis (create ticket, dashboard) | k6 / Artillery |
| Security Test | Uji RBAC (akses lintas role harus ditolak), uji injection dasar | Manual + OWASP ZAP (opsional) |

**Target minimum sebelum rilis:**
- Seluruh Acceptance Criteria pada Bagian 8 lulus.
- Seluruh transisi ilegal pada matriks Bagian 9.1 teruji (harus ditolak sistem).
- Code coverage business logic ≥ 70%.
- Tidak ada kerentanan **Critical/High** pada dependency scan (`npm audit` / Snyk).

---

# 18. Deployment & DevOps (Menggunakan Docker)

> Proyek ini **menggunakan Docker dan Docker Compose**. Seluruh service, termasuk backend, frontend, database, message broker, dan cache dijalankan di dalam container untuk development, staging, maupun production guna memastikan lingkungan yang konsisten (parity).

## 18.1 Strategi Service

| Service | Development | Production/Staging |
|---|---|---|
| Backend (NestJS) | Container Docker via `docker-compose up` | Container Docker via Docker Swarm / Kubernetes / VPS dengan `docker-compose` |
| Frontend (Next.js) | Container Docker via `docker-compose up` | Container Docker via Docker Swarm / Kubernetes / VPS dengan `docker-compose` |
| Database (PostgreSQL) | Image `postgres:15-alpine` lokal di Docker | Managed PostgreSQL (AWS RDS, DigitalOcean) atau Image Docker dengan Volume terpisah |
| Cache (Redis) | Image `redis:alpine` lokal di Docker | Redis Cloud/Elasticache atau Image Docker dengan Volume terpisah |
| Message Broker (RabbitMQ) | Image `rabbitmq:3-management` lokal di Docker | CloudAMQP tier production atau Image Docker RabbitMQ |
| Worker (Notification/Activity/Analytics) | Container Docker via `docker-compose up` | Container Docker terpisah yang dikelola via orchestrator (Swarm/K8s/Compose) |
| Email (SMTP) | **Mailtrap** (email testing) | SMTP provider asli (SendGrid, Mailgun, SES) |
| File Storage (attachment) | Local disk mount via Docker Volume | **Supabase Storage** atau S3-compatible object storage |

## 18.2 Environment Variables (contoh minimum)

```text
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/helpdeskpro

# Cache
REDIS_URL=redis://redis:6379

# Message Broker
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# File Storage
FILE_STORAGE_ENDPOINT=
MAX_UPLOAD_SIZE_MB=10

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=
```

Lihat file `SETUP.md` dan `.env.example` pada repo untuk konfigurasi variabel lingkungan di atas.

## 18.3 Menjalankan Aplikasi Secara Lokal (Development)

Menggunakan Docker Compose untuk menjalankan seluruh dependensi dan service sekaligus.

```bash
# Menjalankan seluruh environment via Docker Compose
docker-compose up -d

# Menjalankan migrasi Prisma ke dalam container backend
docker-compose exec backend npx prisma migrate dev --name init
```

## 18.4 Deployment Production Menggunakan Docker

Gunakan **Docker Compose** atau orchestrator seperti Docker Swarm / Kubernetes.

```bash
# Build image docker untuk production
docker-compose -f docker-compose.prod.yml build

# Jalankan service di mode detached
docker-compose -f docker-compose.prod.yml up -d
```

## 18.5 CI/CD (GitHub Actions dengan Docker Build)

Pipeline: **lint → unit test → docker build → push registry → deploy**.

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      
  docker-build-push:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Build and Push Docker Image
        run: |
          docker build -t helpdeskpro-api:latest ./app-backend
          # docker push myregistry/helpdeskpro-api:latest
```

Deployment ke server production dilakukan dengan menggunakan image Docker terbaru yang telah berhasil melewati test dan build di CI.


---

# 19. Success Metrics

## 19.1 Technical
- Seluruh endpoint pada Bagian 15 berfungsi sesuai spesifikasi dan lulus test.
- RabbitMQ memproses 100% event tanpa pesan yang stuck di DLQ dalam kondisi normal.
- Redis melakukan caching dashboard dengan cache-hit ratio ≥ 80% pada penggunaan normal.
- CQRS memisahkan command dan query secara konsisten di seluruh modul.
- Tidak ada transisi status ilegal yang berhasil (100% tervalidasi oleh state machine).

## 19.2 Business
- Tiket berhasil dibuat, ditangani, dan ditutup mengikuti alur end-to-end tanpa intervensi manual di database.
- Dashboard menampilkan statistik real-time dengan delay maksimum sesuai TTL cache (≤ 60 detik).
- Supervisor dapat memonitor SLA dan menerima eskalasi otomatis.
- SLA Compliance Rate dapat dihitung dan dilaporkan secara akurat.
- Rating rata-rata dan feedback pengguna dapat direkap dalam laporan performa teknisi.

---

# 20. Risks & Mitigation

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Event RabbitMQ hilang saat consumer down | Notifikasi/log tidak tercatat | Durable queue + persistent message + DLQ + retry |
| Race condition saat reassign tiket bersamaan | Data assignment tidak konsisten | Row-level lock / optimistic locking pada tabel Ticket |
| Cache Redis stale (data dashboard tidak update) | Supervisor mengambil keputusan dari data usang | Invalidasi cache berbasis event, bukan hanya TTL |
| Upload file berbahaya (malware) | Risiko keamanan | Validasi MIME type, scan antivirus (opsional fase lanjutan), batasi ekstensi |
| Timeline 7 hari terlalu ketat untuk seluruh scope | Fitur tidak selesai/kualitas menurun | Prioritaskan modul inti (Auth, Ticket, Assignment, Dashboard) di awal, fitur sekunder (Report export, rating) dapat menyusul |

---

# 21. Milestone (7 Hari)

| Hari | Deliverable |
|---|---|
| 1 | PRD (dokumen ini), SKPL, Use Case, ERD, Desain Arsitektur, OpenAPI draft |
| 2 | Authentication, User Management, Role, Department |
| 3 | Ticket Management (CRUD + state machine), Category, Priority/SLA |
| 4 | Assignment, Comment, Attachment, Notification |
| 5 | Integrasi CQRS penuh, RabbitMQ (event + worker), Redis caching |
| 6 | Dashboard, Reports (export PDF/Excel), Testing (unit + integration + e2e) |
| 7 | Dokumentasi teknis final, hardening keamanan, presentasi, demo |

---

# 22. Catatan Penutup

Dokumen ini menjadi **acuan utama** seluruh AI Agent dalam proses pengembangan, sehingga seluruh artefak turunan — SKPL, diagram UML, ERD, spesifikasi OpenAPI, kode implementasi, skenario pengujian, hingga dokumentasi akhir — **wajib konsisten** dengan kebutuhan, aturan bisnis, dan kontrak data yang didefinisikan di sini.

Setiap perubahan kebutuhan pada fase implementasi wajib direfleksikan kembali ke dokumen ini (versi dinaikkan, dicatat di Revision History) sebelum diteruskan ke AI Agent lain, agar seluruh tim/agent selalu bekerja dari satu sumber kebenaran yang sama.
