# Phase 6 — Task 2: Reports Module — Export PDF & Excel

> **Phase:** 6 — Dashboard, Reports, Testing  
> **Estimasi:** Hari ke-6  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 7.11 (FR-REPORT), Bagian 15.9

---

## Deskripsi

Implementasi modul laporan yang mendukung filter data dan export ke format PDF dan Excel (.xlsx).

---

## Sub-Tasks

### 2.1 Install Dependencies

- [ ] Install library untuk generate PDF:
  - `pdfkit` atau `puppeteer` (untuk HTML-to-PDF)
  - Rekomendasi: `pdfmake` (pure JS, tidak butuh headless browser)
- [ ] Install library untuk generate Excel:
  - `exceljs` (fitur lengkap, support styling)

### 2.2 Report Service

- [ ] Buat `ReportService` dengan method:
  - `generateTicketReport(filters, format): Promise<Buffer>`
  - `generateTechnicianPerformanceReport(filters, format): Promise<Buffer>`
- [ ] Parameter filter (FR-REPORT-01):
  - `dateFrom` / `dateTo` — rentang tanggal, wajib
  - `departmentId` — opsional
  - `categoryId` — opsional
  - `priorityId` — opsional
  - `technicianId` — opsional
  - `status` — opsional
- [ ] Parameter `format`: `pdf` | `xlsx`

### 2.3 Ticket Report — `GET /api/v1/reports/tickets`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Query params: `format=pdf|xlsx`, plus filter params
- [ ] Konten laporan:
  - **Header**: Judul laporan, periode, tanggal generate
  - **Summary**: Total tiket, breakdown per status, SLA compliance rate
  - **Tabel detail tiket**:
    | No | Ticket # | Judul | Priority | Status | Dibuat Oleh | Teknisi | Dibuat | Selesai | SLA |
    |---|---|---|---|---|---|---|---|---|---|
  - **Footer**: Catatan, generator info
- [ ] Response: file download (stream)
  - Content-Type: `application/pdf` atau `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Content-Disposition: `attachment; filename="ticket-report-{date}.{ext}"`

### 2.4 Technician Performance Report — `GET /api/v1/reports/technician-performance`

- [ ] Role: `@Roles('SUPERVISOR', 'ADMINISTRATOR')`
- [ ] Query params: `format=pdf|xlsx`, plus filter params
- [ ] Konten laporan (FR-REPORT-03):
  - **Summary per teknisi**:
    | Teknisi | Total Tiket | Selesai | Rata-rata Waktu | Rating | SLA Compliance |
    |---|---|---|---|---|---|
  - **Detail per teknisi** (opsional):
    - Daftar tiket yang ditangani dalam periode
    - Breakdown per priority
  - **Ranking** berdasarkan performa

### 2.5 PDF Generator

- [ ] Buat `PdfGeneratorService`:
  - Method `generateTicketReportPdf(data): Promise<Buffer>`
  - Method `generateTechnicianReportPdf(data): Promise<Buffer>`
  - Styling:
    - Header dengan logo/nama perusahaan (opsional)
    - Tabel dengan border dan alternating row color
    - Page number di footer
    - Tanggal generate di header

### 2.6 Excel Generator

- [ ] Buat `ExcelGeneratorService`:
  - Method `generateTicketReportExcel(data): Promise<Buffer>`
  - Method `generateTechnicianReportExcel(data): Promise<Buffer>`
  - Styling:
    - Header row bold dengan background color
    - Auto-fit column width
    - Summary section di atas tabel
    - Sheet name yang deskriptif
    - Data type formatting (date, number, percentage)

### 2.7 Report Filter DTO

- [ ] Buat `ReportFilterDto`:
  ```typescript
  class ReportFilterDto {
    @IsDateString() dateFrom: string;
    @IsDateString() dateTo: string;
    @IsOptional() @IsUUID() departmentId?: string;
    @IsOptional() @IsUUID() categoryId?: string;
    @IsOptional() @IsUUID() priorityId?: string;
    @IsOptional() @IsUUID() technicianId?: string;
    @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
    @IsIn(['pdf', 'xlsx']) format: 'pdf' | 'xlsx';
  }
  ```

---

## Definition of Done

- [ ] Endpoint ticket report menghasilkan file PDF yang bisa di-download
- [ ] Endpoint ticket report menghasilkan file Excel yang bisa di-download
- [ ] Endpoint technician performance report tersedia di kedua format
- [ ] Filter (tanggal, department, category, priority, technician) bekerja
- [ ] PDF terformat rapi (tabel, header, footer)
- [ ] Excel memiliki styling (header bold, auto-fit, date formatting)
- [ ] Swagger docs lengkap (file download response)
- [ ] Unit test: ReportService filter logic
- [ ] Integration test: generate PDF/Excel dari data test
