# Phase 5 — Task 2: SLA Monitoring & Eskalasi Otomatis

> **Phase:** 5 — Integrasi CQRS Penuh, RabbitMQ (Event + Worker), Redis Caching  
> **Estimasi:** Hari ke-5  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 11 (SLA Rules), Bagian 11.1 (Eskalasi Otomatis), Bagian 7.7 (FR-CLOSE-04: Auto-close)

---

## Deskripsi

Implementasi job scheduler yang memonitor SLA tiket, mengirim warning saat mendekati batas waktu, menandai tiket overdue, dan auto-close tiket yang sudah resolved tapi tidak direspons Employee.

---

## Sub-Tasks

### 2.1 SLA Calculator Service

- [x] Buat `SlaService` dengan method:
  - `calculateSlaDueAt(priorityId: string, startTime: Date): Date`
    - Ambil `slaResolutionMinutes` dari priority
    - Return `startTime + slaResolutionMinutes`
  - `calculateFrtDueAt(priorityId: string, startTime: Date): Date`
    - Ambil `slaResponseMinutes` dari priority
    - Return `startTime + slaResponseMinutes`
  - `getRemainingTime(slaDueAt: Date): number` — return sisa menit
  - `getRemainingPercentage(slaDueAt: Date, totalMinutes: number): number` — return sisa %
  - `isOverdue(slaDueAt: Date): boolean`
  - `isWarning(slaDueAt: Date, totalMinutes: number): boolean` — true jika sisa ≤ 20%

### 2.2 SLA Checker Cron Job

- [x] Buat scheduled job yang berjalan **setiap 5 menit** (PRD Bagian 11.1):
  ```typescript
  @Cron('*/5 * * * *')
  async checkSlaCompliance() { ... }
  ```
- [x] Logic:
  1. Query semua tiket dengan status `ASSIGNED` atau `IN_PROGRESS` yang memiliki `slaDueAt`
  2. Untuk setiap tiket:
     - **SLA Warning** (sisa ≤ 20%):
       - Cek apakah warning sudah pernah dikirim (gunakan Redis flag: `sla:warned:{ticketId}`)
       - Jika belum → publish event `sla.warning` ke RabbitMQ
       - Set flag di Redis agar tidak kirim warning berulang
     - **SLA Breach** (slaDueAt sudah terlampaui):
       - Update field `isOverdue = true` pada tiket (tambahkan field ini jika belum ada di schema)
       - Publish event `sla.breach` ke RabbitMQ
       - Catat di audit log
  3. Update cache `sla:overdue:list` di Redis (TTL 5 menit)

### 2.3 Auto-Close Cron Job

- [x] Buat scheduled job yang berjalan **setiap 1 jam** (atau sesuai kebutuhan):
  ```typescript
  @Cron('0 * * * *')
  async autoCloseResolvedTickets() { ... }
  ```
- [x] Logic (FR-CLOSE-04):
  1. Query tiket dengan status `RESOLVED` yang `resolvedAt` > 3 hari (72 jam) tanpa respons Employee
  2. Untuk setiap tiket:
     - Update status → `CLOSED`
     - Set `closedAt = now`
     - Buat TicketHistory (note: "Auto-closed: tidak ada respons dalam 3x24 jam")
     - Publish event `ticket.closed` (dengan flag `autoClose = true`)
  3. Log total tiket yang di-auto-close

### 2.4 Field `isOverdue` pada Ticket

- [x] Tambahkan field `isOverdue` (Boolean, default false) ke model `Ticket` di Prisma schema
- [x] Jalankan migrasi: `npx prisma migrate dev --name add_is_overdue`
- [x] Update index untuk mendukung query overdue tickets
- [x] Update `GetTicketListQuery` agar bisa filter `isOverdue = true`

### 2.5 SLA Event Payloads

- [x] Definisikan payload event SLA:
  ```typescript
  // sla.warning
  {
    eventType: 'SlaWarning',
    ticketId: string,
    ticketNumber: string,
    priority: string,
    slaDueAt: string, // ISO 8601
    remainingMinutes: number,
    remainingPercentage: number,
    assignedTo: string, // technician ID
    timestamp: string,
  }

  // sla.breach
  {
    eventType: 'SlaBreach',
    ticketId: string,
    ticketNumber: string,
    priority: string,
    slaDueAt: string,
    overdueMinutes: number,
    assignedTo: string,
    timestamp: string,
  }
  ```

### 2.6 SLA Dashboard Data (Cache)

- [x] Setiap kali SLA checker berjalan, update cache Redis:
  - Key: `sla:overdue:list` — daftar tiket overdue (untuk dashboard supervisor)
  - Key: `sla:compliance:rate` — persentase SLA compliance (tiket selesai dalam SLA / total tiket)
  - TTL: 5 menit
- [x] Data ini akan dikonsumsi oleh Dashboard module (Phase 6)

---

## Definition of Done

- [x] SLA checker cron job berjalan setiap 5 menit
- [x] Warning dikirim saat sisa SLA ≤ 20% (hanya sekali per tiket)
- [x] Tiket ditandai `isOverdue = true` saat SLA terlampaui
- [x] Event `sla.warning` dan `sla.breach` ter-publish ke RabbitMQ
- [x] Auto-close berjalan untuk tiket RESOLVED tanpa respons > 72 jam
- [x] Cache SLA overdue list & compliance rate terupdate
- [x] Migrasi `isOverdue` berhasil
- [x] Unit test: SlaService (calculate, isOverdue, isWarning)
- [x] Unit test: SLA checker logic (warning threshold, breach detection)
- [x] Unit test: Auto-close logic (72 jam threshold)
