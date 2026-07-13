# Standar API HelpDeskPro

## Format Response

Semua endpoint API (termasuk pagination dan error) wajib mengembalikan format struktur JSON yang seragam (`ApiResponse<T>`).

### Sukses (Single Object)
```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Masalah Login"
  }
}
```

### Sukses (Paginated / List)
```json
{
  "success": true,
  "data": [
    { "id": "1", "title": "Ticket A" },
    { "id": "2", "title": "Ticket B" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "errors": ["title must be a string"]
      }
    ]
  }
}
```

## HTTP Status Codes

- `200 OK`: Permintaan GET/PUT/PATCH/DELETE berhasil.
- `201 Created`: Pembuatan resource baru via POST berhasil.
- `400 Bad Request`: Kesalahan validasi atau payload.
- `401 Unauthorized`: Kredensial tidak valid (Token expired/missing).
- `403 Forbidden`: Tidak memiliki hak akses (Role tidak sesuai / Bukan pemilik resource).
- `404 Not Found`: Resource tidak ditemukan.
- `409 Conflict`: Data bentrok (Contoh: email sudah terdaftar).
- `422 Unprocessable Entity`: Aturan bisnis dilanggar (Contoh: Menutup tiket yang masih Open).
- `429 Too Many Requests`: Rate Limit terlampaui.
- `500 Internal Server Error`: Kesalahan server tak terduga.

## Naming Convention
- Endpoint menggunakan `kebab-case` dan representasi sumber daya (noun).
- Format: `GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`.
- Relasi: `GET /api/tickets/:id/comments`.

## Pagination & Filtering Standard
Query params untuk pencarian atau paginasi:
- `page`: Halaman ke- (default: 1)
- `limit`: Jumlah data per halaman (default: 20)
- `sortBy`: Field yang akan diurutkan
- `sortOrder`: `asc` atau `desc`
- `search`: Kata kunci pencarian global
- Contoh: `GET /api/tickets?page=2&limit=10&status=OPEN&sortBy=createdAt&sortOrder=desc`
