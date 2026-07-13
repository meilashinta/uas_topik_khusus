# Arsitektur HelpDeskPro

Dokumen ini menjelaskan arsitektur teknis dari HelpDeskPro.

## High-Level Architecture

Sistem menggunakan pola arsitektur Modular Monolith. Backend dikembangkan dengan NestJS, dan Frontend menggunakan Next.js. Database utama adalah PostgreSQL, Redis digunakan untuk caching, dan RabbitMQ digunakan untuk message broker asinkron.

```mermaid
graph TD
    Client[Browser / Next.js Client]
    Frontend[Next.js Server / BFF]
    Backend[NestJS Backend API]
    DB[(PostgreSQL)]
    Cache[(Redis)]
    MQ((RabbitMQ))
    Workers[Background Workers]

    Client <-->|REST API| Frontend
    Frontend <-->|REST API| Backend
    Backend <-->|Prisma ORM| DB
    Backend <-->|Cache Aside| Cache
    Backend -->|Publish Events| MQ
    MQ -->|Consume Events| Workers
    Workers <-->|Prisma ORM| DB
```

## Pola CQRS (Lightweight)

HelpDeskPro menggunakan pemisahan tanggung jawab antara Command (Write) dan Query (Read) pada tingkat servis atau controller, tanpa perlu menggunakan full Event Sourcing yang rumit.
- **Commands**: Endpoint POST, PUT, DELETE, PATCH akan langsung menulis ke database dan menerbitkan domain events ke RabbitMQ.
- **Queries**: Endpoint GET akan membaca dari database (dengan optimasi index) atau dari Redis Cache untuk data yang sering diakses.

## Event-Driven Flow (RabbitMQ)

Setiap aksi penting di sistem (seperti `TICKET_CREATED`, `TICKET_ASSIGNED`) akan menerbitkan pesan ke RabbitMQ (exchange `ticket.events`). Background worker yang berjalan terpisah akan mendengarkan pesan-pesan ini untuk melakukan tugas asinkron seperti mengirim email notifikasi, mencatat log aktivitas (audit), dan memperbarui statistik.

```mermaid
sequenceDiagram
    participant User
    participant API as NestJS API
    participant MQ as RabbitMQ
    participant Worker as Notification Worker

    User->>API: POST /tickets
    API->>Database: Save Ticket
    API->>MQ: Publish TicketCreatedEvent
    API-->>User: 201 Created
    MQ->>Worker: Deliver Event
    Worker->>Email Service: Send Email Notification
```

## Caching Strategy

Sistem menggunakan **Cache-Aside Pattern** dengan Redis:
1. Aplikasi mengecek cache untuk mencari data.
2. Jika ada (Cache Hit), kembalikan data langsung.
3. Jika tidak ada (Cache Miss), ambil data dari Database.
4. Simpan data yang didapat ke Cache dengan Time-To-Live (TTL).
5. Pada saat mutasi (Update/Delete), lakukan invalidasi atau update cache key yang bersangkutan.

## Diagram Modul NestJS

```mermaid
graph TD
    AppModule[AppModule]
    Common[CommonModule]
    Infra[InfrastructureModules<br/>Redis, RabbitMQ]
    Core[Core Business Modules<br/>Auth, Tickets, Users, dll]
    
    AppModule --> Common
    AppModule --> Infra
    AppModule --> Core
```
