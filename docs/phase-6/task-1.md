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

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')` (TECHNICIAN bisa lihat dashboard pribadi)
- [ ] Buat `GetDashboardSummaryQuery` handler
- [ ] Response data (FR-DASH-01):
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
- [ ] Filter opsional:
  - `period` — `today` | `week` | `month` | `custom`
  - `dateFrom` / `dateTo` — untuk custom range
  - `departmentId` — filter per department
- [ ] Cache di Redis: key `dashboard:summary:{role}:{userId}`, TTL 60 detik (FR-DASH-05)
- [ ] Untuk **TECHNICIAN**: tampilkan hanya statistik tiket miliknya (yang di-assign)

### 1.2 SLA Compliance — `GET /api/v1/dashboard/sla-compliance`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Buat `GetSlaComplianceQuery` handler
- [ ] Response data (FR-DASH-02):
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
- [ ] Filter: `dateFrom`, `dateTo`, `departmentId`
- [ ] Cache: TTL 60 detik
- [ ] Perhitungan SLA Compliance Rate:
  ```
  rate = (tiket CLOSED/RESOLVED dimana resolvedAt - createdAt ≤ slaResolutionMinutes) / total tiket * 100
  ```

### 1.3 Technician Performance — `GET /api/v1/dashboard/technician-performance`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Buat `GetTechnicianPerformanceQuery` handler
- [ ] Response data (FR-DASH-03):
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
- [ ] Filter: `dateFrom`, `dateTo`, `departmentId`
- [ ] Cache: TTL 60 detik

### 1.4 Ticket Trend — `GET /api/v1/dashboard/ticket-trend`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Response data (FR-DASH-04):
  ```typescript
  {
    period: 'day' | 'week' | 'month',
    data: [
      { date: string, created: number, resolved: number, closed: number }
    ]
  }
  ```
- [ ] Grafik tren tiket per hari/minggu/bulan
- [ ] Default: 30 hari terakhir
- [ ] Cache: TTL 60 detik

### 1.5 Dashboard Role-Based View

- [ ] **Administrator**: melihat data seluruh organisasi
- [ ] **Supervisor**: melihat data departemen-nya dan tiket yang dia supervisi
- [ ] **Technician**: hanya melihat dashboard pribadi:
  - Tiket yang di-assign (aktif)
  - Statistik personal (rata-rata waktu, rating)
  - Tiket overdue miliknya
- [ ] **Employee**: TIDAK ada akses dashboard (403)

---

## Definition of Done

- [ ] Endpoint summary menampilkan data statistik lengkap per periode
- [ ] SLA compliance rate terhitung akurat per priority
- [ ] Technician performance menampilkan metrik lengkap
- [ ] Ticket trend menampilkan data grafik per hari/minggu/bulan
- [ ] Cache 60 detik aktif di semua endpoint dashboard
- [ ] Role-based view bekerja (Admin vs Supervisor vs Technician)
- [ ] Swagger docs lengkap
- [ ] Unit test: StatisticsService calculations, SLA compliance formula
