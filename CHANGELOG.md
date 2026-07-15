# Changelog

Semua rilis dan perubahan signifikan pada repositori HelpDeskPro akan didokumentasikan di berkas ini. Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan menggunakan [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-15
Rilis stabil pertama. Semua fase dari PRD telah diselesaikan.

### Added
- **Authentication & RBAC**: Pendaftaran akun, login, otentikasi JWT, sistem Role (Employee, Technician, Supervisor, Administrator), serta hierarki otorisasi pada setiap endpoint.
- **Ticket Lifecycle**: CRUD tiket dari status *OPEN* hingga *CLOSED/REJECTED*, pelacakan riwayat (*Audit Log* transisi status), serta SLA yang terhitung berdasarkan prioritas tiket.
- **Ticket Assignment & Collaboration**: Manajemen penugasan teknisi (*Assignment*), dukungan komentar internal/publik, sistem unggah lampiran, dan pemberian *Rating*.
- **Admin Management**: Modul manajemen departemen, kategori tiket, *role*, serta kontrol penuh terhadap akun pengguna oleh *Administrator*.
- **Dashboard & Reporting**: Papan metrik rangkuman performa (tiket ter-*resolve*, *SLA Breach Rate*, DSB.), grafik penyelesaian, serta fitur **Cetak Laporan Otomatis** format PDF dan Excel.
- **Microservices & Analytics**: Skrip *Worker* terpisah dengan basis antrean dari RabbitMQ untuk menjalan perhitungan metrik latar belakang secara asinkron (mengisi tabel Redis Cache).
- **Security**: Pengamanan *Header* menggunakan `Helmet.js`, manajemen *CORS*, pembatasan beban trafik global (100req/min) via `nestjs/throttler`, dan proteksi *Rate Limiting* sandi untuk login.
- **CI/CD Pipeline**: *Pipeline* `Github Actions` untuk melakukan uji ketat pada *linting*, *unit test* dan *build checking* untuk frontend maupun backend.

### Fixed
- Isu integrasi EcmaScript Module (ESM) pada NestJS khususnya perbaikan rute Node.js terhadap pustaka `pdfmake` dengan merekayasa pemanggilan API _compiled_ CommonJS.
- Isu port *EADDRINUSE* yang mengunci soket NestJS pada kondisi pembaruan kode.

### Known Issues / Limitations
- Integrasi SMTP sesungguhnya (*email sending*) baru berupa *console logging* via kelas *Mock*.
- Tidak ada rotasi otomatis untuk *file logs* di level aplikasi (harus menggunakan `pm2-logrotate` di *server environment*).

## [0.1.0] - Tahap Alpha
- _Inisialisasi Project_
- Pembuatan struktur _monorepo_ dengan `app-backend` dan `app-frontend`.
- Skema *Prisma* dan migrasi awal.
