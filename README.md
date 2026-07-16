# HelpDeskPro 🚀

[![CI/CD Pipeline](https://github.com/your-username/helpdeskpro/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/helpdeskpro/actions)

HelpDeskPro adalah aplikasi **Sistem Manajemen Layanan IT (ITSM)** berbasis web yang membantu organisasi mengelola siklus hidup permintaan bantuan (*ticket*) secara *end-to-end* dengan dukungan *Role-Based Access Control* (RBAC) dan *Service Level Agreement* (SLA).

## ✨ Fitur Utama
- **Role-Based Access Control (RBAC):** Memisahkan akses antara Employee (Karyawan), Technician (Teknisi), Supervisor, dan Administrator. Dasbor dan data otomatis disesuaikan (*dynamic filtering*) berdasarkan *role* yang sedang aktif.
- **SLA Management & Escalation:** Sistem target penyelesaian yang dihitung otomatis berdasarkan prioritas, beserta notifikasi *warning* dan eskalasi.
- **Ticket Lifecycle:** Pelacakan tiket dari *Open*, *In Progress*, *Resolved*, hingga *Closed* (dengan kemampuan *Reopen* dan *Reject*).
- **Master Data Management:** Pengaturan Kategori, Departemen, Prioritas, dan Pengguna dengan dukungan *soft-delete*, aktivasi ulang (*reactivation*), serta UI/UX *Modal* tanpa *native alert*.
- **Audit & History:** Pencatatan otomatis riwayat perubahan tiket tanpa kompromi.
- **File Attachments:** Dukungan lampiran *file* dengan validasi MIME & batas ukuran untuk bukti atau tangkapan layar.
- **Comments & Rating:** Komunikasi antar *user* dan sistem penentuan kepuasan layanan di akhir penyelesaian.
- **Reporting & Dashboard:** Dasbor metrik *real-time* dengan UI modern bergaya *Glassmorphism* dan kemampuan *export* laporan (*PDF* & *Excel*).

## 🛠️ Tech Stack
- **Backend Framework:** NestJS (TypeScript), Express
- **Frontend Framework:** Next.js (TypeScript)
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL
- **Caching & Rate Limiting:** Redis
- **Message Broker:** RabbitMQ
- **Documentation:** Swagger OpenAPI

## 📋 Prerequisites
Sebelum menjalankan aplikasi, pastikan sistem Anda telah ter-instal:
- Node.js (v20 LTS atau v22 direkomendasikan)
- npm atau yarn
- Docker & Docker Compose (Untuk dependensi *infrastructure*)

## 🚀 Quick Start Guide

1. **Clone repository ini**
   ```bash
   git clone https://github.com/your-username/helpdeskpro.git
   cd helpdeskpro
   ```

2. **Jalankan Infrastruktur (Database, Redis, RabbitMQ)**
   ```bash
   docker compose up -d
   ```

3. **Setup Backend**
   ```bash
   cd app-backend
   npm install
   
   # Salin template environment
   cp .env.example .env
   
   # Migrasi Database & Seeding (Role, User admin, dsb)
   npx prisma migrate dev
   npx prisma db seed
   
   # Jalankan Server (Mode Development)
   npm run start:dev
   ```

4. **Setup Frontend**
   ```bash
   cd ../app-frontend
   npm install
   
   # Jalankan Web (Mode Development)
   npm run dev
   ```

Aplikasi web sekarang dapat diakses pada [http://localhost:3001](http://localhost:3001), dan *Backend* berjalan pada [http://localhost:3000](http://localhost:3000).

## 📂 Struktur Direktori Utama

```
helpdeskpro/
├── app-backend/           # Server NestJS (Controllers, Services, Modules)
│   ├── src/
│   ├── prisma/            # Skema dan Migrasi Database
│   └── test/              # Unit & E2E Testing
├── app-frontend/          # Aplikasi Klien Next.js
├── docs/                  # Seluruh Dokumentasi Teknis dan Rekayasa
└── docker-compose.yml     # Konfigurasi Infrastruktur Cepat
```

## 📚 Tautan Dokumentasi Lanjutan

Bagi para pengembang yang ingin berkontribusi lebih dalam atau melakukan *deployment*, silakan merujuk pada:
- [Setup Environment Lengkap](SETUP.md)
- [Arsitektur Teknis Sistem](docs/architecture.md)
- [Standar API Backend](docs/api-standards.md)
- [Dokumentasi Database & ERD](docs/database.md)
- [Panduan Deployment (PM2)](docs/deployment.md)
- [Changelog Rilis](CHANGELOG.md)
- **API Documentation (Swagger UI)**: Buka [http://localhost:3000/api/docs](http://localhost:3000/api/docs) saat server backend berjalan.

## 👥 Tim & Kontributor
Proyek ini dikembangkan sebagai bagian dari UAS Topik Khusus.

## 📝 Lisensi
Proyek ini bersifat *UNLICENSED* untuk keperluan akademis / *private use*.
