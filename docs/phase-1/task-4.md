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

- [ ] Buat `RedisModule` sebagai global module
- [ ] Buat `RedisService` dengan method:
  - `get(key: string): Promise<string | null>`
  - `set(key: string, value: string, ttlSeconds?: number): Promise<void>`
  - `del(key: string): Promise<void>`
  - `delByPattern(pattern: string): Promise<void>` — untuk invalidasi cache pattern
  - `incr(key: string): Promise<number>` — untuk rate limiting counter
  - `expire(key: string, ttlSeconds: number): Promise<void>`
- [ ] Konfigurasi koneksi ke Upstash Redis via `REDIS_URL` dari environment
- [ ] Tambahkan health check untuk Redis (bisa ping/pong)
- [ ] Buat unit test mock untuk `RedisService`

### 4.2 RabbitMQ Module

- [ ] Buat `RabbitMQModule` sebagai global module
- [ ] Buat `RabbitMQService` dengan method:
  - `publish(exchange: string, routingKey: string, payload: object): Promise<void>`
  - `subscribe(queue: string, handler: Function): Promise<void>`
- [ ] Konfigurasi koneksi ke CloudAMQP via `RABBITMQ_URL` dari environment
- [ ] Setup exchange & queue sesuai PRD Bagian 13.1:
  - Exchange `ticket.events` (topic)
  - Exchange `sla.events` (topic)
  - Queue `notification-worker`
  - Queue `activity-worker`
  - Queue `analytics-worker`
  - Binding routing key sesuai tabel PRD
- [ ] Implementasi:
  - Durable queue
  - Persistent message
  - Manual ACK
  - Dead Letter Queue (DLQ) untuk pesan yang gagal 3x retry
- [ ] Tambahkan health check untuk RabbitMQ
- [ ] Buat unit test mock untuk `RabbitMQService`

### 4.3 Event Publisher Helper

- [ ] Buat class `EventPublisher` yang membungkus `RabbitMQService.publish()` dengan:
  - Auto-generate `eventId` (UUID) untuk idempotency
  - Auto-set `timestamp` (ISO 8601 UTC)
  - Type-safe event payload interface
- [ ] Buat interface event sesuai PRD Bagian 13.2:
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

- [ ] Buat `CacheService` yang mengimplementasikan **cache-aside pattern**:
  - `getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T>`
  - Baca cache → jika miss → jalankan fetcher → simpan ke cache → return
- [ ] Buat key constants sesuai PRD Bagian 14:
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

- [ ] Buat endpoint `GET /health` yang mengecek:
  - Database (Prisma) connectivity
  - Redis connectivity
  - RabbitMQ connectivity
- [ ] Buat endpoint `GET /ready` yang return status readiness
- [ ] Register di `HealthModule`

---

## Definition of Done

- [ ] Redis connection berhasil (bisa set/get key)
- [ ] RabbitMQ connection berhasil (bisa publish/subscribe test message)
- [ ] Exchange & queue ter-declare otomatis saat app start
- [ ] DLQ terkonfigurasi dan routing benar
- [ ] Health check endpoint return status semua dependency
- [ ] Unit test untuk `CacheService.getOrSet` (hit & miss scenario)
- [ ] Unit test untuk `EventPublisher` (payload format verification)
