# Phase 5 — Task 3: Analytics Worker & Redis Cache Integration

> **Phase:** 5 — Integrasi CQRS Penuh, RabbitMQ (Event + Worker), Redis Caching  
> **Estimasi:** Hari ke-5  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 13.3 (Analytics Worker), Bagian 14 (Redis Cache Strategy)

---

## Deskripsi

Implementasi Analytics Worker yang memperbarui agregat statistik untuk Dashboard dan Reports, serta melakukan invalidasi cache Redis secara event-driven.

---

## Sub-Tasks

### 3.1 Analytics Worker (RabbitMQ Consumer)

- [ ] Buat `AnalyticsWorker` yang subscribe ke queue `analytics-worker`
- [ ] Handle event:
  | Event | Aksi Worker |
  |---|---|
  | `ticket.created` | Increment `ticket:open:count`, invalidasi dashboard cache |
  | `ticket.assigned` | Invalidasi `ticket:open:count`, update technician workload cache |
  | `ticket.status_changed` | Update count per status, invalidasi dashboard cache |
  | `ticket.closed` | Increment `ticket:closed:count`, update SLA compliance stats |
  | `ticket.resolved` | Update rata-rata resolution time |
  | `sla.warning` | Update SLA overdue list cache |
  | `sla.breach` | Update SLA overdue list, update compliance rate |
- [ ] Implementasi idempotency (cek `eventId`)
- [ ] Manual ACK setelah berhasil
- [ ] Error → retry 3x → DLQ

### 3.2 Cache Invalidation per Event

- [ ] Implementasi invalidasi cache sesuai PRD Bagian 14:
  ```typescript
  // Saat ticket.created
  await redis.del('ticket:open:count');
  await redis.del(`dashboard:summary:*`); // invalidate all dashboard caches

  // Saat ticket.assigned
  await redis.del('ticket:open:count');
  await redis.del(`ticket:${ticketId}`);
  await redis.del(`dashboard:summary:*`);

  // Saat ticket.status_changed
  await redis.del(`ticket:${ticketId}`);
  await redis.del(`dashboard:summary:*`);

  // Saat ticket.closed
  await redis.del('ticket:closed:count');
  await redis.del(`ticket:${ticketId}`);
  await redis.del(`dashboard:summary:*`);
  ```
- [ ] Gunakan `redis.delByPattern()` atau `SCAN` + `DEL` untuk wildcard keys

### 3.3 Agregat Statistik Service

- [ ] Buat `StatisticsService` untuk menghitung dan meng-cache statistik:
  - `getTicketCountByStatus(): Promise<Record<TicketStatus, number>>`
  - `getSlaComplianceRate(dateRange?): Promise<number>` — persentase tiket selesai dalam SLA
  - `getAverageResolutionTime(dateRange?): Promise<number>` — rata-rata waktu resolusi (menit)
  - `getAverageFirstResponseTime(dateRange?): Promise<number>`
  - `getTicketTrend(period: 'day' | 'week' | 'month', range: number): Promise<TrendData[]>`
  - `getTechnicianStats(technicianId?): Promise<TechnicianStats>`
- [ ] Semua method menggunakan cache-aside pattern:
  1. Cek cache Redis (TTL 60 detik sesuai PRD)
  2. Jika miss → query database → hitung → simpan ke cache → return

### 3.4 Technician Performance Stats

- [ ] Buat method untuk menghitung statistik per technician:
  - Jumlah tiket selesai (total & per periode)
  - Rata-rata waktu penyelesaian
  - Rata-rata rating
  - Jumlah tiket overdue
  - SLA compliance rate personal
- [ ] Cache key: `technician:stats:{technicianId}` (TTL: 60 detik)

### 3.5 Worker Startup & Script

- [ ] Buat entry point worker: `src/workers/analytics.worker.ts`
- [ ] Konfigurasi npm script:
  ```json
  "start:worker:analytics": "ts-node src/workers/analytics.worker.ts"
  ```
- [ ] Worker harus bisa berjalan sebagai proses terpisah dari API server
- [ ] Pastikan worker connect ke Redis & RabbitMQ dengan benar
- [ ] Log startup: "Analytics Worker started, listening on queue: analytics-worker"

### 3.6 Notification Worker Startup

- [ ] Buat entry point: `src/workers/notification.worker.ts`
- [ ] Konfigurasi npm script:
  ```json
  "start:worker:notification": "ts-node src/workers/notification.worker.ts"
  ```

### 3.7 Activity Worker Startup

- [ ] Buat entry point: `src/workers/activity.worker.ts`
- [ ] Konfigurasi npm script:
  ```json
  "start:worker:activity": "ts-node src/workers/activity.worker.ts"
  ```

---

## Definition of Done

- [ ] Analytics Worker memproses event dan memperbarui cache
- [ ] Cache invalidation berjalan event-driven (bukan hanya TTL)
- [ ] StatisticsService menghitung semua metrik yang dibutuhkan Dashboard
- [ ] Cache-aside pattern diterapkan di semua query statistik
- [ ] Semua 3 worker bisa berjalan sebagai proses terpisah
- [ ] NPM scripts tersedia untuk menjalankan setiap worker
- [ ] Unit test: cache invalidation logic, statistics calculation
- [ ] Integration test: publish event → worker update cache → cache berisi data baru
