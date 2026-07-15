# Dokumentasi Database & Entity Relationship Diagram (ERD)

Sistem HelpDeskPro menggunakan **PostgreSQL** sebagai penyimpanan basis data relasional (RDBMS) utama dengan **Prisma** sebagai ORM (*Object Relational Mapping*).

## Entity Relationship Diagram (ERD)

Diagram berikut mengilustrasikan entitas-entitas dalam sistem beserta kardinalitas relasinya.

```mermaid
erDiagram
    Role ||--o{ User : "has users"
    Department ||--o{ User : "has members"
    Department ||--o{ TicketCategory : "manages categories"
    User ||--o{ Ticket : "creates"
    User ||--o{ Assignment : "is assigned as technician"
    User ||--o{ Assignment : "assigns tickets (assigner)"
    User ||--o{ TicketComment : "writes comments"
    User ||--o{ TicketAttachment : "uploads files"
    User ||--o{ TicketHistory : "triggers history"
    User ||--o{ Notification : "receives"
    User ||--o{ ActivityLog : "performs actions"
    User ||--o{ Rating : "submits"
    User ||--o{ PasswordHistory : "has passwords"
    TicketCategory ||--o{ Ticket : "categorizes"
    TicketPriority ||--o{ Ticket : "prioritizes"
    Ticket ||--o{ Assignment : "has assignments"
    Ticket ||--o{ TicketComment : "has comments"
    Ticket ||--o{ TicketAttachment : "has attachments"
    Ticket ||--o{ TicketHistory : "has history logs"
    Ticket ||--o| Rating : "receives rating"

    Role {
        uuid id PK
        enum name "EMPLOYEE | TECHNICIAN | SUPERVISOR | ADMIN"
        string description
    }

    Department {
        uuid id PK
        string name
        string code UK
        boolean isActive
    }

    User {
        uuid id PK
        string name
        string email UK
        string passwordHash
        uuid roleId FK
        uuid departmentId FK
        boolean isActive
    }

    TicketCategory {
        uuid id PK
        string name
        string description
        uuid departmentId FK
    }

    TicketPriority {
        uuid id PK
        enum name "CRITICAL | HIGH | MEDIUM | LOW"
        int slaResponseMinutes
        int slaResolutionMinutes
    }

    Ticket {
        uuid id PK
        string ticketNumber UK
        string title
        text description
        uuid categoryId FK
        uuid priorityId FK
        enum status "OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED | REJECTED | CANCELLED"
        uuid createdById FK
        dateTime slaDueAt
        boolean isOverdue
    }

    Assignment {
        uuid id PK
        uuid ticketId FK
        uuid technicianId FK
        uuid assignedById FK
        string reason
    }

    TicketComment {
        uuid id PK
        uuid ticketId FK
        uuid userId FK
        text content
        boolean isInternal
    }

    TicketAttachment {
        uuid id PK
        uuid ticketId FK
        string fileName
        string fileUrl
        int fileSize
    }

    TicketHistory {
        uuid id PK
        uuid ticketId FK
        string fromStatus
        string toStatus
        uuid changedById FK
    }

    Notification {
        uuid id PK
        uuid userId FK
        string type
        string title
        boolean isRead
    }

    ActivityLog {
        uuid id PK
        uuid userId FK
        string action
        string entityType
        uuid entityId
        jsonb metadata
    }

    Rating {
        uuid id PK
        uuid ticketId FK
        uuid ratedById FK
        int score
        text feedback
    }
```

## Penjelasan Entitas Utama

1. **User, Role, & Department**: Struktur RBAC dan keorganisasian.
   - `Role`: Menentukan level akses aplikasi.
   - `Department`: Mengelompokkan Karyawan dan Teknisi ke dalam departemen spesifik.

2. **Ticket, TicketCategory, & TicketPriority**: Core entity ITSM.
   - `TicketCategory`: Topik permasalahan yang terikat pada departemen tertentu (contoh: *Network* diurus oleh departemen IT).
   - `TicketPriority`: Mendefinisikan batasan SLA (*Service Level Agreement*).
   - `Ticket`: Tabel sentral pelacakan permintaan pengguna, dilacak melalui kolom `ticketNumber`.

3. **Assignment, TicketComment, & TicketAttachment**: Proses Penyelesaian.
   - `Assignment`: Tabel persimpangan (*junction*) yang melacak teknisi mana yang menangani tiket tertentu, serta siapa supervisor yang menugaskannya.
   - `TicketComment`: Data diskusi tiket, fitur `isInternal` membedakan pesan yang hanya terlihat oleh teknisi & supervisor.

4. **Tracking & Observability**:
   - `TicketHistory`: Mencatat transisi status tiket secara ketat (Audit Trail status).
   - `ActivityLog`: Skema logging general yang menyimpan `metadata` berbasis *JSONB* untuk aktivitas non-status.
   - `Notification`: Catatan notifikasi *in-app* untuk pengguna.

## Indeksasi (Index Strategy)
Kami menerapkan indeksasi komprehensif pada database untuk menjamin performa:
1. Peringatan Dini (SLA): `@@index([isOverdue])` (Opsional/Bisa ditambahkan kelak untuk cron).
2. Tiket Dashboard: `@@index([status])`, `@@index([priorityId])`, `@@index([categoryId])`, `@@index([createdAt])`
3. Keamanan & Lookup: `@@index([email])`, `@@index([code])`

## Default Seed Data
Secara otomatis setelah migrasi `npx prisma db seed` berjalan, basis data akan dihuni oleh:
- 4 Buah Hak Akses (Role): `EMPLOYEE`, `TECHNICIAN`, `SUPERVISOR`, `ADMINISTRATOR`.
- 1 Departemen *Default*: `IT Support`
- 1 User Administrator: `admin@helpdeskpro.local` (Password: `password123`)

## Manajemen Migrasi
1. Tambah atau modifikasi struktur database di `prisma/schema.prisma`.
2. Buat skrip migrasi dengan mengeksekusi perintah:
   ```bash
   npx prisma migrate dev --name deskripsi_perubahan
   ```
3. Migrasi untuk *production*:
   ```bash
   npx prisma migrate deploy
   ```
