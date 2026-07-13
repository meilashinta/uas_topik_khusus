# Phase 4 — Task 4: Modul Notification (In-App & Email)

> **Phase:** 4 — Assignment, Comment, Attachment, Notification  
> **Estimasi:** Hari ke-4  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 7.9 (FR-NOTIF), Bagian 15.8

---

## Deskripsi

Implementasi sistem notifikasi in-app dan email yang dipicu oleh event dari RabbitMQ.

---

## Sub-Tasks

### 4.1 Notification Service

- [ ] Buat `NotificationService` dengan method:
  - `createNotification(userId, type, title, message): Promise<Notification>`
  - `createBulkNotifications(userIds[], type, title, message): Promise<void>`
  - `markAsRead(notificationId, userId): Promise<void>`
  - `markAllAsRead(userId): Promise<void>`
  - `getUserNotifications(userId, filters): Promise<Notification[]>`
  - `getUnreadCount(userId): Promise<number>`

### 4.2 Notification Type Constants

- [ ] Definisikan semua tipe notifikasi sesuai PRD FR-NOTIF-01:
  ```typescript
  enum NotificationType {
    TICKET_CREATED = 'TICKET_CREATED',
    TICKET_ASSIGNED = 'TICKET_ASSIGNED',
    TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
    TICKET_RESOLVED = 'TICKET_RESOLVED',
    TICKET_CLOSED = 'TICKET_CLOSED',
    TICKET_REJECTED = 'TICKET_REJECTED',
    TICKET_COMMENT_ADDED = 'TICKET_COMMENT_ADDED',
    SLA_WARNING = 'SLA_WARNING',
    SLA_BREACH = 'SLA_BREACH',
  }
  ```
- [ ] Buat template pesan untuk setiap tipe (Bahasa Indonesia):
  ```
  TICKET_CREATED: "Tiket baru #{ticketNumber} telah dibuat oleh {creatorName}"
  TICKET_ASSIGNED: "Tiket #{ticketNumber} telah ditugaskan kepada Anda"
  ...
  ```

### 4.3 Notification Endpoints

#### 4.3.1 Get Notifications — `GET /api/v1/notifications`

- [ ] Auth required, semua role
- [ ] Filter: `isRead` (boolean), `type` (string)
- [ ] Pagination, sorted by `createdAt DESC`
- [ ] Include `unreadCount` di meta response

#### 4.3.2 Mark as Read — `PATCH /api/v1/notifications/:id/read`

- [ ] Auth required
- [ ] Validasi notification milik user yang sedang login
- [ ] Set `isRead = true`

#### 4.3.3 Mark All as Read — `PATCH /api/v1/notifications/read-all`

- [ ] Auth required
- [ ] Set semua notifikasi user yang belum dibaca menjadi `isRead = true`

### 4.4 Notification Worker (RabbitMQ Consumer)

- [ ] Buat `NotificationWorker` yang subscribe ke queue `notification-worker`
- [ ] Handle routing key & event:
  | Event | Penerima Notifikasi | Channel |
  |---|---|---|
  | `ticket.created` | Supervisor terkait department | In-app + Email |
  | `ticket.assigned` | Technician yang ditugaskan | In-app + Email |
  | `ticket.status_changed` | Employee pemilik + Technician | In-app |
  | `ticket.resolved` | Employee pemilik | In-app + Email |
  | `ticket.closed` | Technician yang menangani | In-app |
  | `ticket.rejected` | Employee pemilik | In-app + Email |
  | `sla.warning` | Supervisor | In-app + Email |
  | `sla.breach` | Supervisor + Administrator | In-app + Email |
- [ ] Implementasi idempotency: cek `eventId` agar tidak proses event duplikat
- [ ] Manual ACK setelah berhasil proses

### 4.5 Email Notification

- [ ] Buat template email HTML untuk setiap tipe notifikasi
- [ ] Gunakan `EmailService` yang sudah dibuat di Phase 2
- [ ] Kirim email async (tidak blocking worker)
- [ ] Handle error: jika email gagal kirim, log warning tapi JANGAN retry (agar tidak block worker)

### 4.6 User Notification Preferences (FR-NOTIF-03)

- [ ] Tambah field di model User (atau tabel terpisah `NotificationPreference`):
  - `emailNotificationEnabled` — boolean, default `true`
- [ ] Worker harus cek preference user sebelum kirim email
- [ ] Endpoint update preference: `PATCH /api/v1/users/me/notification-preferences`

---

## Definition of Done

- [ ] Notifikasi in-app tersimpan di database saat event terjadi
- [ ] Email terkirim ke user (via Mailtrap di development)
- [ ] User bisa melihat list notifikasi dengan filter & pagination
- [ ] User bisa mark as read (single & all)
- [ ] Worker idempotent (event duplikat tidak membuat notifikasi ganda)
- [ ] Preference email bisa diubah per user
- [ ] Swagger docs lengkap
- [ ] Unit test: notification creation, preference check, mark as read
