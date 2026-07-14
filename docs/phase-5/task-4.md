# Phase 5 — Task 4: Integrasi CQRS Penuh di Seluruh Modul

> **Phase:** 5 — Integrasi CQRS Penuh, RabbitMQ (Event + Worker), Redis Caching  
> **Estimasi:** Hari ke-5  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 12.1 (CQRS), Bagian 12.2 (Prinsip Implementasi)

---

## Deskripsi

Review dan refactor seluruh modul agar konsisten menerapkan pola CQRS — pemisahan Command (tulis) dan Query (baca) handler. Pastikan setiap command hanya menulis + publish event, dan setiap query memanfaatkan cache.

---

## Sub-Tasks

### 4.1 Audit Konsistensi CQRS

- [ ] Review setiap modul dan pastikan mengikuti pola:
  - **Command Handler**: validasi → write DB → publish event → return
  - **Query Handler**: cek cache → jika miss, query DB → isi cache → return
- [ ] Checklist modul:
  | Modul | Commands | Queries |
  |---|---|---|
  | Auth | RegisterCommand, LoginCommand, RefreshTokenCommand, LogoutCommand, ForgotPasswordCommand, ResetPasswordCommand, ChangePasswordCommand | — |
  | Users | CreateUserCommand, UpdateUserCommand, DeactivateUserCommand, UpdateProfileCommand | GetUserListQuery, GetUserDetailQuery, GetProfileQuery |
  | Departments | CreateDepartmentCommand, UpdateDepartmentCommand, DeactivateDepartmentCommand | GetDepartmentListQuery, GetDepartmentDetailQuery |
  | Categories | CreateCategoryCommand, UpdateCategoryCommand, DeactivateCategoryCommand | GetCategoryListQuery, GetCategoryDetailQuery |
  | Priorities | CreatePriorityCommand, UpdatePriorityCommand | GetPriorityListQuery, GetPriorityDetailQuery |
  | Tickets | CreateTicketCommand, UpdateTicketCommand, CancelTicketCommand, UpdateStatusCommand, RejectTicketCommand, CloseTicketCommand, ReopenTicketCommand | GetTicketListQuery, GetTicketDetailQuery, SearchTicketQuery |
  | Assignments | AssignTechnicianCommand, ReassignTechnicianCommand | GetTechnicianWorkloadQuery |
  | Comments | AddCommentCommand | GetCommentsQuery |
  | Attachments | UploadAttachmentCommand, DeleteAttachmentCommand | — (inline di ticket detail) |
  | Ratings | SubmitRatingCommand | — (inline di ticket detail) |
  | Notifications | MarkAsReadCommand, MarkAllAsReadCommand | GetNotificationsQuery |
  | Dashboard | — | GetDashboardSummaryQuery, GetSlaComplianceQuery, GetTechnicianPerformanceQuery |
  | Reports | — | GetTicketReportQuery, GetTechnicianReportQuery |
  | Audit Log | — | GetAuditLogsQuery |

### 4.2 Refactor Command Handlers

- [ ] Pastikan SEMUA command handler memenuhi prinsip:
  1. Menerima DTO yang sudah divalidasi
  2. Melakukan business logic validation
  3. Write ke database (via Prisma)
  4. Publish domain event ke RabbitMQ
  5. Return hasil (created/updated entity)
  6. TIDAK melakukan query kompleks atau agregrasi
- [ ] Pastikan setiap command publish event yang sesuai

### 4.3 Refactor Query Handlers

- [ ] Pastikan SEMUA query handler memenuhi prinsip:
  1. Menerima filter/pagination params
  2. Cek Redis cache terlebih dahulu
  3. Jika cache miss → query database
  4. Simpan ke cache dengan TTL yang sesuai
  5. Return data
  6. TIDAK mengubah state (no side effects)
- [ ] Tambahkan caching di query yang belum di-cache:
  - `GetTicketDetailQuery` → cache `ticket:{id}` (30 detik)
  - `GetUserDetailQuery` → cache `user:{id}` (5 menit)
  - `GetDashboardSummaryQuery` → cache `dashboard:summary:{role}:{userId}` (60 detik)

### 4.4 Controller Cleanup

- [ ] Pastikan setiap Controller hanya menjadi "thin layer":
  - Parse request params/body
  - Panggil Command atau Query handler
  - Return response
  - TIDAK berisi business logic

### 4.5 Event Publishing Consistency

- [ ] Buat checklist semua event yang harus di-publish:
  | Event | Routing Key | Publisher |
  |---|---|---|
  | TicketCreated | `ticket.created` | CreateTicketCommand |
  | TicketAssigned | `ticket.assigned` | AssignTechnicianCommand |
  | TicketStatusChanged | `ticket.status_changed` | UpdateStatusCommand |
  | TicketResolved | `ticket.resolved` | UpdateStatusCommand (ke RESOLVED) |
  | TicketClosed | `ticket.closed` | CloseTicketCommand / AutoCloseJob |
  | TicketRejected | `ticket.rejected` | RejectTicketCommand |
  | SlaWarning | `sla.warning` | SlaCheckerJob |
  | SlaBreach | `sla.breach` | SlaCheckerJob |
- [ ] Verifikasi setiap event memiliki `eventId`, `timestamp`, dan payload lengkap

---

## Definition of Done

- [ ] Seluruh modul memisahkan Command dan Query handler
- [ ] Seluruh Command handler publish event ke RabbitMQ
- [ ] Seluruh Query handler yang sering diakses memanfaatkan Redis cache
- [ ] Controller hanya menjadi thin layer
- [ ] Tidak ada business logic di Controller
- [ ] Semua event ter-publish dengan format konsisten
- [ ] Code review: tidak ada query handler yang mengubah state
- [ ] Code review: tidak ada command handler yang melakukan agregasi data
