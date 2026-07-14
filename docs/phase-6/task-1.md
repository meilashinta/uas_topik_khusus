# Phase 6 — Task 1: Dashboard API — Summary & SLA Compliance

> **Phase:** 6 — Dashboard, Reports, Testing  
> **Estimasi:** Hari ke-6  
> **Prioritas:** 🔴 Critical  
> **Referensi PRD:** Bagian 7.10 (FR-DASH), Bagian 15.9

---

## Deskripsi

Implementasi endpoint Dashboard yang menampilkan ringkasan statistik tiket, SLA compliance rate, dan data performa untuk Supervisor dan Administrator.

---

## Sub-Tasks

### 1.1 Dashboard Summary — `GET /api/v1/dashboard/summary`

- [x] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')` (TECHNICIAN bisa lihat dashboard pribadi)
- [x] Buat `GetDashboardSummaryQuery` handler
- [x] Response data (FR-DASH-01):
  ```typescript
  {
    totalTickets: number,
    ticketsByStatus: {
      OPEN: number,
      ASSIGNED: number,
      IN_PROGRESS: number,
      RESOLVED: number,
      CLOSED: number,
      REJECTED: number,
    },
    ticketsToday: number,
    ticketsThisWeek: number,
    ticketsThisMonth: number,
    overdueTickets: number,
    averageResolutionTimeMinutes: number,
    averageFirstResponseTimeMinutes: number,
  }
  ```
- [x] Filter opsional:
  - `period` — `today` | `week` | `month` | `custom`
  - `dateFrom` / `dateTo` — untuk custom range
  - `departmentId` — filter per department
- [x] Cache di Redis: key `dashboard:summary:{role}:{userId}`, TTL 60 detik (FR-DASH-05)
- [x] Untuk **TECHNICIAN**: tampilkan hanya statistik tiket miliknya (yang di-assign)

### 1.2 SLA Compliance — `GET /api/v1/dashboard/sla-compliance`

- [x] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [x] Buat `GetSlaComplianceQuery` handler
- [x] Response data (FR-DASH-02):
  ```typescript
  {
    overallComplianceRate: number, // persentase
    complianceByPriority: {
      CRITICAL: { total: number, withinSla: number, rate: number },
      HIGH: { total: number, withinSla: number, rate: number },
      MEDIUM: { total: number, withinSla: number, rate: number },
      LOW: { total: number, withinSla: number, rate: number },
    },
    overdueTickets: TicketSummary[], // daftar tiket yang overdue
    atRiskTickets: TicketSummary[],  // tiket yang mendekati SLA (≤ 20%)
  }
  ```
- [x] Filter: `dateFrom`, `dateTo`, `departmentId`
- [x] Cache: TTL 60 detik
- [x] Perhitungan SLA Compliance Rate:
  ```
  rate = (tiket CLOSED/RESOLVED dimana resolvedAt - createdAt ≤ slaResolutionMinutes) / total tiket * 100
  ```

### 1.3 Technician Performance — `GET /api/v1/dashboard/technician-performance`

- [x] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [x] Buat `GetTechnicianPerformanceQuery` handler
- [x] Response data (FR-DASH-03):
  ```typescript
  {
    technicians: [
      {
        id: string,
        name: string,
        totalTicketsHandled: number,
        totalTicketsActive: number,
        averageResolutionTimeMinutes: number,
        averageRating: number,
        totalRatings: number,
        slaComplianceRate: number,
        ticketsOverdue: number,
      }
    ]
  }
  ```
- [x] Filter: `dateFrom`, `dateTo`, `departmentId`
- [x] Cache: TTL 60 detik

### 1.4 Ticket Trend — `GET /api/v1/dashboard/ticket-trend`

- [x] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [x] Response data (FR-DASH-04):
  ```typescript
  {
    period: 'day' | 'week' | 'month',
    data: [
      { date: string, created: number, resolved: number, closed: number }
    ]
  }
  ```
- [x] Grafik tren tiket per hari/minggu/bulan
- [x] Default: 30 hari terakhir
- [x] Cache: TTL 60 detik

### 1.5 Dashboard Role-Based View

- [x] **Administrator**: melihat data seluruh organisasi
- [x] **Supervisor**: melihat data departemen-nya dan tiket yang dia supervisi
- [x] **Technician**: hanya melihat dashboard pribadi:
  - Tiket yang di-assign (aktif)
  - Statistik personal (rata-rata waktu, rating)
  - Tiket overdue miliknya
- [x] **Employee**: TIDAK ada akses dashboard (403)

---

## Definition of Done

- [x] Endpoint summary menampilkan data statistik lengkap per periode
- [x] SLA compliance rate terhitung akurat per priority
- [x] Technician performance menampilkan metrik lengkap
- [x] Ticket trend menampilkan data grafik per hari/minggu/bulan
- [x] Cache 60 detik aktif di semua endpoint dashboard
- [x] Role-based view bekerja (Admin vs Supervisor vs Technician)
- [x] Swagger docs lengkap
- [x] Unit test: StatisticsService calculations, SLA compliance formula
