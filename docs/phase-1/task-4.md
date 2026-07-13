# Phase 1 — Task 4: Setup Koneksi Redis & RabbitMQ

> **Phase:** 1 — Dokumentasi, Desain & Setup Awal  
> **Estimasi:** Hari ke-1  
> **Prioritas:** 🟡 High  
> **Referensi PRD:** Bagian 13 (RabbitMQ), Bagian 14 (Redis), Bagian 18 (Deployment)

---

## Deskripsi

Membuat module wrapper untuk koneksi Redis (Upstash) dan RabbitMQ (CloudAMQP) yang reusable di seluruh aplikasi. Termasuk konfigurasi exchange, queue, dan helper caching.

---

## Sub-Tasks

### 4.1 Redis Module

- [x] Buat `RedisModule` sebagai global module
- [x] Buat `RedisService` dengan method:
  - `get(key: string): Promise<string | null>`
  - `set(key: string, value: string, ttlSeconds?: number): Promise<void>`
  - `del(key: string): Promise<void>`
  - `delByPattern(pattern: string): Promise<void>` — untuk invalidasi cache pattern
  - `incr(key: string): Promise<number>` — untuk rate limiting counter
  - `expire(key: string, ttlSeconds: number): Promise<void>`
- [x] Konfigurasi koneksi ke Upstash Redis via `REDIS_URL` dari environment
- [x] Tambahkan health check untuk Redis (bisa ping/pong)
- [x] Buat unit test mock untuk `RedisService`

### 4.2 RabbitMQ Module

- [x] Buat `RabbitMQModule` sebagai global module
- [x] Buat `RabbitMQService` dengan method:
  - `publish(exchange: string, routingKey: string, payload: object): Promise<void>`
  - `subscribe(queue: string, handler: Function): Promise<void>`
- [x] Konfigurasi koneksi ke CloudAMQP via `RABBITMQ_URL` dari environment
- [x] Setup exchange & queue sesuai PRD Bagian 13.1:
  - Exchange `ticket.events` (topic)
  - Exchange `sla.events` (topic)
  - Queue `notification-worker`
  - Queue `activity-worker`
  - Queue `analytics-worker`
  - Binding routing key sesuai tabel PRD
- [x] Implementasi:
  - Durable queue
  - Persistent message
  - Manual ACK
  - Dead Letter Queue (DLQ) untuk pesan yang gagal 3x retry
- [x] Tambahkan health check untuk RabbitMQ
- [x] Buat unit test mock untuk `RabbitMQService`

### 4.3 Event Publisher Helper

- [x] Buat class `EventPublisher` yang membungkus `RabbitMQService.publish()` dengan:
  - Auto-generate `eventId` (UUID) untuk idempotency
  - Auto-set `timestamp` (ISO 8601 UTC)
  - Type-safe event payload interface
- [x] Buat interface event sesuai PRD Bagian 13.2:
  ```typescript
  interface TicketEvent {
    eventId: string;
    eventType: string;
    ticketId: string;
    ticketNumber: string;
    timestamp: string;
    [key: string]: any;
  }
  ```

### 4.4 Cache Helper

- [x] Buat `CacheService` yang mengimplementasikan **cache-aside pattern**:
  - `getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T>`
  - Baca cache → jika miss → jalankan fetcher → simpan ke cache → return
- [x] Buat key constants sesuai PRD Bagian 14:
  ```typescript
  const CACHE_KEYS = {
    DASHBOARD_SUMMARY: (role, userId) => `dashboard:summary:${role}:${userId}`,
    TICKET_OPEN_COUNT: 'ticket:open:count',
    TICKET_DETAIL: (id) => `ticket:${id}`,
    USER_PROFILE: (id) => `user:${id}`,
    RATE_LIMIT_LOGIN: (email) => `ratelimit:login:${email}`,
    SLA_OVERDUE_LIST: 'sla:overdue:list',
  };
  ```

### 4.5 Health Check Endpoints

- [x] Buat endpoint `GET /health` yang mengecek:
  - Database (Prisma) connectivity
  - Redis connectivity
  - RabbitMQ connectivity
- [x] Buat endpoint `GET /ready` yang return status readiness
- [x] Register di `HealthModule`

---

## Definition of Done

- [x] Redis connection berhasil (bisa set/get key)
- [x] RabbitMQ connection berhasil (bisa publish/subscribe test message)
- [x] Exchange & queue ter-declare otomatis saat app start
- [x] DLQ terkonfigurasi dan routing benar
- [x] Health check endpoint return status semua dependency
- [x] Unit test untuk `CacheService.getOrSet` (hit & miss scenario)
- [x] Unit test untuk `EventPublisher` (payload format verification)
