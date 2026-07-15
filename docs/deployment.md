# Panduan Deployment (Production)

Dokumen ini memuat panduan lengkap cara melakukan *deployment* HelpDeskPro ke server *production* yang berbasis Linux (misalnya Ubuntu) dengan memanfaatkan **Node.js** dan **PM2** sebagai *process manager*.

## Arsitektur Deployment

- **Infrastruktur Eksternal**: PostgreSQL, Redis, RabbitMQ disarankan di-*host* pada layanan terkelola (contoh: AWS RDS, ElastiCache, Amazon MQ) atau server terpisah via Docker.
- **Backend API**: Berjalan di atas Node.js (via PM2) pada port 3000. Reverse Proxy (Nginx/Apache) akan menangani SSL/TLS dan meneruskan trafik ke port 3000.
- **Frontend App**: Berjalan di atas Node.js (Next.js server) (via PM2) pada port 3001. Trafik disalurkan via Reverse Proxy dari port 80/443.

---

## 1. Persiapan Server

Pastikan server *Production* memiliki instalasi berikut:
- **Node.js**: `v20.x` LTS atau lebih baru.
- **PM2**: Instal secara global melalui perintah `npm install -g pm2`.
- **Nginx**: Berfungsi sebagai *reverse proxy*.
- Kredensial *Database* dan *Message Broker* yang bisa dihubungi.

---

## 2. Environment Variables (.env)

Buat file `.env` di masing-masing direktori aplikasi:

### Backend (`app-backend/.env`)
```env
# Database Credentials
DATABASE_URL="postgresql://user:password@hostname:5432/helpdeskpro?schema=public"

# Redis & RabbitMQ
REDIS_URL="redis://user:password@hostname:6379"
RABBITMQ_URL="amqp://user:password@hostname:5672"

# Security Secrets (Gunakan kata sandi yang kuat dan acak)
JWT_ACCESS_SECRET="strong_production_access_secret_123"
JWT_REFRESH_SECRET="strong_production_refresh_secret_123"

# Application Settings
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://helpdesk.perusahaananda.com
```

### Frontend (`app-frontend/.env.production`)
```env
NEXT_PUBLIC_API_URL=https://api.helpdesk.perusahaananda.com
```

---

## 3. Kompilasi dan Build

### Build Backend
```bash
cd app-backend
npm ci                 # Instal dependensi bersih (pure)
npx prisma generate    # Generate Prisma Client
npm run build          # Kompilasi TypeScript -> JavaScript
```

### Build Frontend
```bash
cd ../app-frontend
npm ci                 # Instal dependensi bersih (pure)
npm run build          # Kompilasi aplikasi Next.js
```

---

## 4. Eksekusi Migrasi Database (Prisma)

Hati-hati! Di *production*, JANGAN menggunakan `migrate dev`. Gunakan `migrate deploy` untuk menerapkan migrasi SQL tanpa memodifikasi skema *state* pelacakan.

```bash
cd app-backend
npx prisma migrate deploy
```
Jika ini adalah instalasi pertama kali, Anda bisa menjalankan *seeder*:
```bash
npx prisma db seed
```

---

## 5. Menjalankan Aplikasi via PM2

Buat berkas konfigurasi `ecosystem.config.js` di dalam direktori *root* (atau sejajar dengan direktori *backend/frontend*).

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'helpdesk-backend',
      cwd: './app-backend',
      script: 'dist/main.js',
      instances: 'max',       // Jalankan di semua core CPU
      exec_mode: 'cluster',   // Clustering mode
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'helpdesk-frontend',
      cwd: './app-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,           // Next.js biasa tidak perlu di-cluster jika tidak ada logika stateful khusus
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'helpdesk-worker',
      cwd: './app-backend',
      script: 'dist/workers/main.js', // Jalankan service microservices jika ada
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

**Mulai Eksekusi:**
```bash
pm2 start ecosystem.config.js
pm2 save                # Simpan konfigurasi agar berjalan otomatis saat boot
pm2 startup             # Mengaktifkan autostart script
```

---

## 6. Manajemen Log (Log Rotation)

Karena PM2 akan mencetak *log* terus menerus, disarankan memasang modul rotasi log:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 7. Strategi Pencadangan (Backup) Database

Untuk menjaga agar data *ticketing* perusahaan tetap aman, wajib membuat skrip pencadangan PostgreSQL (`pg_dump`) via *cron job* setiap hari pada jam 00:00:
```bash
0 0 * * * pg_dump -U username -h hostname helpdeskpro | gzip > /backups/helpdesk_$(date +\%Y\%m\%d).sql.gz
```
Rekomendasi: Kirim arsip `.sql.gz` ke layanan S3 (misal Amazon S3 atau MinIO) secara otomatis sesaat setelah pencadangan sukses.
