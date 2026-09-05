# POSMart — Point of Sale

Aplikasi kasir (POS) dengan **frontend React (Vite + Tailwind)** dan **backend Laravel 11**.

## Arsitektur

```
C:\POS
├── src/            # Frontend React (Vite + Tailwind)
├── public/product/ # Folder gambar produk (disajikan frontend)
├── backend/        # Backend API Laravel
│   ├── app/Http/Controllers/   # Controller (Auth, Product, Order, Admin)
│   ├── routes/api.php          # Definisi semua endpoint API
│   └── ...
└── vite.config.js  # Proxy /api -> localhost:8000 (Laravel)
```

Backend awalnya PHP native, dan telah dimigrasikan ke **Laravel**. Endpoint tetap
menggunakan path PHP lama (mis. `/get.product.php`, `/user/login.php`) sehingga
frontend React **tidak perlu diubah**.

## Teknologi

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router, Axios
- **Backend:** Laravel 13 (Framework), PHP 8.3, MySQL, Laravel Sanctum (auth token)

## Database

Menggunakan database MySQL `db_posmart` yang sudah ada. Tabel:
`users`, `products`, `orders`, `order_items`, `personal_access_tokens`.

> Data lama dipertahankan. Migration Laravel dibuat **conditional** (hanya membuat
> tabel jika belum ada), sehingga aman dijalankan terhadap database existing.
> **Jangan** jalankan `php artisan migrate:fresh` jika ingin mempertahankan data.

## Menjalankan (Development)

### 1. Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env    # lalu sesuaikan kredensial MySQL
php artisan key:generate
php artisan migrate     # aman: tabel dibuat hanya jika belum ada
php artisan serve --port=8000
```

_kredensial DB ada di `backend/.env` (`db_posmart`, user `test`)._

### 2. Frontend (React/Vite)

```bash
npm install
npm run dev             # default localhost:5173
```

Vite memproxy semua request `/api` ke `http://localhost:8000` (lihat `vite.config.js`).

## Akun Default (dari seeder DB lama)

| Role    | Email            | Password    |
|---------|------------------|-------------|
| Admin   | admin@posmart.com| posmart2026 |
| Cashier | cashier@posmart.com | password123 |

## Endpoint API

Semua endpoint dipanggil via `/api` (diawali di frontend, di-strip proxy):

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/get.product.php` | Publik | Katalog + filter + pagination |
| GET | `/get.product.php?categories=1` | Publik | Daftar kategori |
| POST | `/user/register.php` | Publik | Register |
| POST | `/user/login.php` | Publik | Login (Sanctum token) |
| POST | `/user/googleauth.php` | Publik | Login Google OAuth |
| POST | `/cart/create_order.php` | Sanctum | Checkout (transaksi stok) |
| GET/POST/PUT/DELETE | `/admin/products.php` | Admin | CRUD produk |
| GET/PUT | `/admin/orders.php` | Admin | List & status order |
| GET | `/admin/stats.php` | Admin | Statistik dashboard |
| POST | `/admin/upload_product_image.php` | Admin | Upload gambar produk |

Format respons mengikuti PHP native: `{ "status": "success", "data": ... }`
dengan token autentikasi `Authorization: Bearer <token>`.
