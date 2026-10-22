# Sistem Informasi Penjualan dan Pembelian Buku Berbasis Web

Dokumentasi lengkap database dan arsitektur aplikasi toko buku dengan stack **GitHub + React (Vite) + Vercel + Neon (PostgreSQL)**.

Dokumen ini dibuat untuk tiga pembaca sekaligus: **manusia** (penjelasan rinci), **GitHub Copilot / AI assistant** (konteks terstruktur), dan **terminal** (semua file inti bisa diekstrak dan dijalankan dari README ini).

---

## Daftar isi

1. [Ringkasan proyek dan stack](#1-ringkasan-proyek-dan-stack)
2. [Arsitektur](#2-arsitektur)
3. [Konteks untuk AI / Copilot](#3-konteks-untuk-ai--copilot)
4. [Struktur repositori](#4-struktur-repositori)
5. [Quick start](#5-quick-start)
6. [Diagram ERD](#6-diagram-erd)
7. [Kamus data](#7-kamus-data)
8. [Relasi dan aturan bisnis](#8-relasi-dan-aturan-bisnis)
9. [Migrasi database (SQL)](#9-migrasi-database-sql)
10. [Backend: Vercel Functions](#10-backend-vercel-functions)
11. [Kontrak API](#11-kontrak-api)
12. [Frontend: React](#12-frontend-react)
13. [Konfigurasi file pendukung](#13-konfigurasi-file-pendukung)
14. [Deploy: GitHub, Vercel, Neon](#14-deploy-github-vercel-neon)
15. [Contoh query dan pengujian](#15-contoh-query-dan-pengujian)
16. [Keamanan](#16-keamanan)
17. [Catatan review diagram dan rencana pengembangan](#17-catatan-review-diagram-dan-rencana-pengembangan)
18. [Pemecahan masalah](#18-pemecahan-masalah)

---

## 1. Ringkasan proyek dan stack

| Lapisan | Teknologi | Peran |
|---|---|---|
| Kode dan CI | **GitHub** + GitHub Actions | Repositori, review PR, build check, migrasi manual |
| Frontend | **React** (Vite, JavaScript) | Antarmuka admin/kasir |
| Hosting dan backend | **Vercel** (static hosting + Serverless Functions di folder `api/`) | Menyajikan React dan menyediakan REST API |
| Database | **Neon** (PostgreSQL serverless) | Penyimpanan data, trigger, view, fungsi |
| Driver | `@neondatabase/serverless` | Koneksi dari Vercel Functions ke Neon lewat HTTP |
| Auth | `bcryptjs` + `jose` (JWT di cookie httpOnly) | Login admin dan kontrol hak akses |

### Modul data

- **Data Pelanggan**: identitas dan kontak pembeli.
- **Data Buku**: katalog, harga, stok, genre, penerbit, suplier.
- **Data Pembelian**: header nota (satu nota milik satu pelanggan).
- **Data Penjualan**: rincian item pada nota (buku, jumlah, harga, admin yang memproses).
- **Data Admin**: akun pengelola/kasir.

### Cara membaca istilah

- `pembelian` = **header nota** transaksi dari sudut pandang pelanggan.
- `penjualan` = **baris rincian item** pada nota itu (buku yang terjual, diproses admin).

Satu pembelian punya banyak baris penjualan. Pola ini setara dengan `orders` dan `order_items`.

---

## 2. Arsitektur

```mermaid
flowchart LR
    DEV[Developer] -->|git push / PR| GH[GitHub]
    GH -->|webhook| VC[Vercel]
    subgraph VC[Vercel]
        FE[React build - static]
        FN[Serverless Functions /api/*]
    end
    BR[Browser] -->|buka halaman| FE
    BR -->|fetch /api/... + cookie| FN
    FN -->|HTTPS, neon driver| NEON[(Neon PostgreSQL)]
```

### Prinsip penting

1. **React tidak pernah terhubung langsung ke Neon.** Kode React berjalan di browser; connection string di sana bisa dibaca siapa saja. Semua akses database lewat `api/*` (Vercel Functions) yang menyimpan `DATABASE_URL` sebagai environment variable server.
2. **Jangan memakai awalan `VITE_`** untuk rahasia. Variabel berawalan `VITE_` ikut tertanam di bundel frontend.
3. **Logika yang butuh atomik ada di database.** Pembuatan nota (header + semua item + pengurangan stok + total) dijalankan oleh satu fungsi SQL `fn_buat_transaksi`, jadi aman dipanggil lewat satu request HTTP ke Neon tanpa transaksi interaktif.
4. **Frontend dan API satu domain** (`/api/...`), jadi tidak perlu CORS dan cookie `httpOnly` + `SameSite=Strict` bekerja langsung.

### Alur membuat transaksi

```
Kasir (React) -> POST /api/transaksi {id_pelanggan, items[]}
   -> Vercel Function: cek JWT, validasi input
   -> SELECT * FROM fn_buat_transaksi(...)   (1 panggilan ke Neon, atomik)
        -> INSERT pembelian
        -> INSERT penjualan per item  -> trigger: cek stok, kurangi stok, isi harga, hitung total
   <- {id_pembelian, no_transaksi, total}
```

---

## 3. Konteks untuk AI / Copilot

```yaml
project: toko-buku
language: id (nama tabel dan kolom berbahasa Indonesia)
stack:
  frontend: React 18+ (Vite, JavaScript, react-router-dom)
  backend: Vercel Serverless Functions (Node 20+, ESM) di folder api/
  database: Neon PostgreSQL 16+, driver @neondatabase/serverless (mode HTTP via neon())
  auth: bcryptjs (hash) + jose (JWT HS256) di cookie httpOnly bernama "token"
  ci: GitHub Actions
hard_rules:
  - JANGAN query database dari kode React. Selalu lewat fetch('/api/...').
  - JANGAN taruh DATABASE_URL, JWT_SECRET, atau rahasia lain di variabel berawalan VITE_.
  - Gunakan tagged template neon(): sql`SELECT ... WHERE id = ${id}` (otomatis parameterized). Jangan menyambung string SQL.
  - Pembuatan transaksi HARUS lewat fungsi SQL fn_buat_transaksi(id_pelanggan, id_admin, items jsonb).
  - Jangan INSERT/UPDATE kolom penjualan.subtotal dan pembelian.total (diisi database).
  - Jangan UPDATE baris penjualan (ditolak trigger). Hapus lalu buat ulang.
  - Perubahan skema = file migrasi baru db/migrations/NNN_nama.sql. Jangan ubah file migrasi yang sudah dijalankan.
  - Password hanya disimpan sebagai hash bcrypt di admin.password_hash.
  - Error Postgres RAISE EXCEPTION (code P0001) -> kirim ke klien sebagai HTTP 409 dengan pesan aslinya.
naming:
  tables: snake_case singular (pelanggan, admin, buku, pembelian, penjualan)
  primary_key: id_<tabel> (SERIAL)
  api_routes: /api/<resource> (huruf kecil, Bahasa Indonesia)
tables:
  pelanggan: {pk: id_pelanggan, cols: [nama, email, no_hp, gender, alamat]}
  admin:     {pk: id_admin, cols: [nama, username, password_hash, role]}
  buku:      {pk: id_buku, cols: [judul, pengarang, harga, stok, genre, penerbit, suplier]}
  pembelian: {pk: id_pembelian, cols: [no_transaksi, tgl_pembelian, total], fk: [id_pelanggan]}
  penjualan: {pk: id_penjualan, cols: [quantity, harga_satuan, subtotal], fk: [id_pembelian, id_buku, id_admin]}
relations:
  - pelanggan 1:N pembelian
  - pembelian 1:N penjualan
  - buku 1:N penjualan
  - admin 1:N penjualan
roles:
  admin: akses penuh (CRUD buku, pelanggan, transaksi, laporan, batalkan nota)
  staff: baca buku, kelola pelanggan, buat transaksi, lihat laporan
env_vars:
  server_only: [DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET]
  script_only: [ADMIN_USERNAME, ADMIN_PASSWORD]
```

---

## 4. Struktur repositori

```
toko-buku/
├── Ai_direc.md                      <- dokumen ini
├── package.json
├── vercel.json
├── .env.example
├── .github/workflows/
│   ├── ci.yml
│   └── migrate.yml
├── db/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_triggers.sql
│   │   ├── 003_views.sql
│   │   └── 004_functions.sql
│   └── seeds/001_dev_seed.sql     <- data contoh, hanya untuk branch dev
├── scripts/
│   ├── migrate.sh
│   └── seed-admin.mjs
├── api/                           <- Vercel Serverless Functions
│   ├── _lib/{db,auth,http}.js
│   ├── auth/{login,logout,me}.js
│   ├── buku/index.js
│   ├── pelanggan/index.js
│   ├── transaksi/index.js
│   └── laporan/index.js
└── src/                           <- React
    ├── main.jsx
    ├── App.jsx
    ├── lib/api.js
    └── pages/{Login,Kasir}.jsx
```

---

## 5. Quick start

Prasyarat: Node.js 20+, Git, akun GitHub, Vercel, dan Neon, serta klien `psql` (paket `postgresql-client`). Di Windows, jalankan perintah `awk` dan `bash` lewat **Git Bash** atau **WSL**.

### 5.1 Buat proyek React dan taruh README ini

```bash
npm create vite@latest toko-buku -- --template react
cd toko-buku
npm install
# salin Ai_direc.md ini ke root folder toko-buku
```

### 5.2 Siapkan Neon

1. Buat project di [neon.com](https://neon.com). Pilih region terdekat dengan pengguna (misalnya Singapore) dan **pakai region yang sama dengan region Vercel Functions** supaya latensi rendah.
2. Di branch `main` (production), salin dua connection string dari tombol **Connect**:
   - **Pooled** (host mengandung `-pooler`) untuk `DATABASE_URL`, dipakai aplikasi.
   - **Unpooled / direct** untuk `DATABASE_URL_UNPOOLED`, dipakai migrasi.
3. Buat branch baru bernama `dev` dari `main`. **Pakai branch `dev` untuk pengembangan lokal** agar data production tidak tersentuh.

### 5.3 Ekstrak semua file dari README ini

Setiap blok kode yang baris pertamanya berbentuk `-- file: path`, `// file: path`, atau `# file: path` akan ditulis ke `path` tersebut. Blok tanpa penanda (contoh, diagram, dokumentasi) diabaikan.

```bash
awk '
/^```/ {
  if (inblk) { inblk = 0; out = "" } else { inblk = 1; first = 1; out = "" }
  next
}
inblk && first {
  first = 0
  if ($0 ~ /^(-- |\/\/ |# )file: /) {
    out = $0; sub(/^.*file: /, "", out)
    dir = out; if (sub(/\/[^\/]*$/, "", dir)) system("mkdir -p \"" dir "\"")
    printf "" > out
  }
  next
}
inblk && out != "" { print > out }
' Ai_direc.md
```

Jika file README memakai akhir baris Windows (CRLF), ubah dulu: `sed -i 's/\r$//' Ai_direc.md`.

`package.json` dan `vercel.json` tidak diekstrak (JSON tidak punya komentar); ikuti bagian 13.

### 5.4 Pasang dependensi dan skrip npm

```bash
npm install @neondatabase/serverless bcryptjs jose react-router-dom
npm pkg set scripts.migrate="bash scripts/migrate.sh"
npm pkg set scripts.seed:admin="node --env-file=.env.local scripts/seed-admin.mjs"
```

### 5.5 Isi environment lokal

```bash
cp .env.example .env.local
# edit .env.local: isi connection string BRANCH DEV dari Neon, JWT_SECRET, ADMIN_*
echo ".env*.local" >> .gitignore
echo ".vercel" >> .gitignore
```

Buat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5.6 Jalankan migrasi dan seed

```bash
npm run migrate                       # menjalankan 001-004 ke Neon (branch dev)
npm run seed:admin                    # membuat akun admin dengan password ter-hash
set -a; . ./.env.local; set +a
psql "$DATABASE_URL_UNPOOLED" -f db/seeds/001_dev_seed.sql   # data contoh buku dan pelanggan
```

### 5.7 Jalankan aplikasi lokal

`vite dev` hanya menyajikan frontend. Untuk menjalankan frontend **dan** folder `api/` bersamaan, pakai Vercel CLI:

```bash
npm install -g vercel
vercel link            # hubungkan folder dengan project Vercel
vercel dev             # buka http://localhost:3000
```

Login memakai `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `.env.local`.

---

## 6. Diagram ERD

```mermaid
erDiagram
    PELANGGAN ||--o{ PEMBELIAN : melakukan
    PEMBELIAN ||--|{ PENJUALAN : masuk_ke
    BUKU ||--o{ PENJUALAN : terjual
    ADMIN ||--o{ PENJUALAN : memproses

    PELANGGAN {
        int id_pelanggan PK
        varchar nama
        varchar email
        varchar no_hp
        varchar gender
        text alamat
    }
    ADMIN {
        int id_admin PK
        varchar nama
        varchar username
        varchar password_hash
        varchar role
    }
    BUKU {
        int id_buku PK
        varchar judul
        varchar pengarang
        numeric harga
        int stok
        varchar genre
        varchar penerbit
        varchar suplier
    }
    PEMBELIAN {
        int id_pembelian PK
        varchar no_transaksi
        date tgl_pembelian
        numeric total
        int id_pelanggan FK
    }
    PENJUALAN {
        int id_penjualan PK
        int quantity
        numeric harga_satuan
        numeric subtotal
        int id_pembelian FK
        int id_buku FK
        int id_admin FK
    }
```

---

## 7. Kamus data

### `pelanggan`

| Kolom | Tipe | Null | Constraint | Keterangan |
|---|---|---|---|---|
| `id_pelanggan` | SERIAL | Tidak | PK | ID unik |
| `nama` | VARCHAR(100) | Tidak | | Nama lengkap |
| `email` | VARCHAR(100) | Ya | UNIQUE | Email |
| `no_hp` | VARCHAR(20) | Ya | | Disimpan sebagai teks agar angka 0 di depan tidak hilang |
| `gender` | VARCHAR(10) | Ya | CHECK `Laki-laki`/`Perempuan` | |
| `alamat` | TEXT | Ya | | |

### `admin`

| Kolom | Tipe | Null | Constraint | Keterangan |
|---|---|---|---|---|
| `id_admin` | SERIAL | Tidak | PK | |
| `nama` | VARCHAR(100) | Tidak | | |
| `username` | VARCHAR(50) | Tidak | UNIQUE | Nama login |
| `password_hash` | VARCHAR(255) | Tidak | | Hash bcrypt, bukan password asli |
| `role` | VARCHAR(20) | Tidak | CHECK `admin`/`staff`, default `staff` | |

### `buku`

| Kolom | Tipe | Null | Constraint | Keterangan |
|---|---|---|---|---|
| `id_buku` | SERIAL | Tidak | PK | |
| `judul` | VARCHAR(200) | Tidak | | |
| `pengarang` | VARCHAR(100) | Ya | | |
| `harga` | NUMERIC(12,2) | Tidak | CHECK >= 0 | Harga jual saat ini |
| `stok` | INT | Tidak | CHECK >= 0, default 0 | |
| `genre` | VARCHAR(50) | Ya | | |
| `penerbit` | VARCHAR(100) | Ya | | |
| `suplier` | VARCHAR(100) | Ya | | |

### `pembelian` (header nota)

| Kolom | Tipe | Null | Constraint | Keterangan |
|---|---|---|---|---|
| `id_pembelian` | SERIAL | Tidak | PK | |
| `no_transaksi` | VARCHAR(30) | Tidak | UNIQUE | Format `TRX-YYYYMMDD-NNNNNN`, dibuat otomatis oleh `fn_buat_transaksi` |
| `tgl_pembelian` | DATE | Tidak | default hari ini | Tanggal menurut zona Asia/Jakarta |
| `total` | NUMERIC(12,2) | Tidak | default 0 | **Diisi trigger** |
| `id_pelanggan` | INT | Ya | FK, ON DELETE SET NULL | Kosong = pembeli umum |

### `penjualan` (rincian item)

| Kolom | Tipe | Null | Constraint | Keterangan |
|---|---|---|---|---|
| `id_penjualan` | SERIAL | Tidak | PK | |
| `id_pembelian` | INT | Tidak | FK, ON DELETE CASCADE | Nota induk |
| `id_buku` | INT | Tidak | FK, ON DELETE RESTRICT | |
| `id_admin` | INT | Tidak | FK, ON DELETE RESTRICT | Admin yang memproses |
| `quantity` | INT | Tidak | CHECK > 0 | |
| `harga_satuan` | NUMERIC(12,2) | Tidak | CHECK >= 0 | Snapshot harga saat transaksi; diisi trigger dari `buku.harga` bila kosong |
| `subtotal` | NUMERIC(12,2) | Tidak | GENERATED | `quantity * harga_satuan` |

---

## 8. Relasi dan aturan bisnis

| Relasi | Kardinalitas | Foreign key | Perilaku hapus |
|---|---|---|---|
| Pelanggan melakukan Pembelian | 1 : N | `pembelian.id_pelanggan` | SET NULL |
| Pembelian masuk ke Penjualan | 1 : N | `penjualan.id_pembelian` | CASCADE |
| Buku terjual dalam Penjualan | 1 : N | `penjualan.id_buku` | RESTRICT |
| Admin memproses Penjualan | 1 : N | `penjualan.id_admin` | RESTRICT |

Aturan bisnis:

1. `quantity` > 0 dan tidak boleh melebihi stok. Jika melebihi, transaksi ditolak.
2. Menambah baris penjualan otomatis **mengurangi** `buku.stok`; menghapusnya **mengembalikan** stok.
3. `harga_satuan` adalah harga saat transaksi; perubahan `buku.harga` tidak mengubah nota lama.
4. `pembelian.total` selalu sama dengan jumlah `subtotal` seluruh rinciannya.
5. Baris penjualan tidak boleh di-UPDATE; hapus lalu buat ulang.
6. Buku dan admin yang punya riwayat transaksi tidak bisa dihapus.
7. Satu nota harus berisi minimal satu item.

---

## 9. Migrasi database (SQL)

Migrasi dijalankan berurutan oleh `scripts/migrate.sh`, dicatat di tabel `schema_migrations`, dan hanya dijalankan **sekali** per file. Aturan: jangan ubah file yang sudah dijalankan di production; tambahkan file baru (`005_...sql`).

### 9.1 Skema tabel

```sql
-- file: db/migrations/001_schema.sql
CREATE TABLE pelanggan (
    id_pelanggan SERIAL PRIMARY KEY,
    nama         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) UNIQUE,
    no_hp        VARCHAR(20),
    gender       VARCHAR(10) CHECK (gender IN ('Laki-laki', 'Perempuan')),
    alamat       TEXT
);

CREATE TABLE admin (
    id_admin      SERIAL PRIMARY KEY,
    nama          VARCHAR(100) NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff'))
);

CREATE TABLE buku (
    id_buku   SERIAL PRIMARY KEY,
    judul     VARCHAR(200)  NOT NULL,
    pengarang VARCHAR(100),
    harga     NUMERIC(12,2) NOT NULL CHECK (harga >= 0),
    stok      INT           NOT NULL DEFAULT 0 CHECK (stok >= 0),
    genre     VARCHAR(50),
    penerbit  VARCHAR(100),
    suplier   VARCHAR(100)
);

CREATE TABLE pembelian (
    id_pembelian  SERIAL PRIMARY KEY,
    no_transaksi  VARCHAR(30)   NOT NULL UNIQUE,
    tgl_pembelian DATE          NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
    total         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    id_pelanggan  INT REFERENCES pelanggan(id_pelanggan) ON DELETE SET NULL
);

CREATE TABLE penjualan (
    id_penjualan SERIAL PRIMARY KEY,
    id_pembelian INT           NOT NULL REFERENCES pembelian(id_pembelian) ON DELETE CASCADE,
    id_buku      INT           NOT NULL REFERENCES buku(id_buku)           ON DELETE RESTRICT,
    id_admin     INT           NOT NULL REFERENCES admin(id_admin)         ON DELETE RESTRICT,
    quantity     INT           NOT NULL CHECK (quantity > 0),
    harga_satuan NUMERIC(12,2) NOT NULL CHECK (harga_satuan >= 0),
    subtotal     NUMERIC(12,2) GENERATED ALWAYS AS (quantity * harga_satuan) STORED
);

CREATE SEQUENCE seq_no_transaksi;

CREATE INDEX idx_buku_judul          ON buku(judul);
CREATE INDEX idx_buku_genre          ON buku(genre);
CREATE INDEX idx_pembelian_tgl       ON pembelian(tgl_pembelian);
CREATE INDEX idx_pembelian_pel       ON pembelian(id_pelanggan);
CREATE INDEX idx_penjualan_pembelian ON penjualan(id_pembelian);
CREATE INDEX idx_penjualan_buku      ON penjualan(id_buku);
CREATE INDEX idx_penjualan_admin     ON penjualan(id_admin);
```

### 9.2 Trigger (stok dan total otomatis)

```sql
-- file: db/migrations/002_triggers.sql
CREATE FUNCTION fn_hitung_ulang_total(p_id_pembelian INT) RETURNS VOID AS $$
BEGIN
    UPDATE pembelian
       SET total = COALESCE((SELECT SUM(subtotal) FROM penjualan WHERE id_pembelian = p_id_pembelian), 0)
     WHERE id_pembelian = p_id_pembelian;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_before_insert() RETURNS TRIGGER AS $$
DECLARE
    v_harga NUMERIC(12,2);
    v_stok  INT;
BEGIN
    SELECT harga, stok INTO v_harga, v_stok
      FROM buku WHERE id_buku = NEW.id_buku FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Buku dengan id % tidak ditemukan', NEW.id_buku;
    END IF;

    IF v_stok < NEW.quantity THEN
        RAISE EXCEPTION 'Stok buku id % tidak cukup (tersedia %, diminta %)',
            NEW.id_buku, v_stok, NEW.quantity;
    END IF;

    IF NEW.harga_satuan IS NULL THEN
        NEW.harga_satuan := v_harga;
    END IF;

    UPDATE buku SET stok = stok - NEW.quantity WHERE id_buku = NEW.id_buku;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_after_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_hitung_ulang_total(NEW.id_pembelian);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buku SET stok = stok + OLD.quantity WHERE id_buku = OLD.id_buku;
        PERFORM fn_hitung_ulang_total(OLD.id_pembelian);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_block_update() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Baris penjualan tidak boleh diubah. Hapus lalu buat ulang.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_penjualan_before_insert
    BEFORE INSERT ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_before_insert();

CREATE TRIGGER trg_penjualan_after_change
    AFTER INSERT OR DELETE ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_after_change();

CREATE TRIGGER trg_penjualan_block_update
    BEFORE UPDATE ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_block_update();
```

### 9.3 View laporan

```sql
-- file: db/migrations/003_views.sql
CREATE VIEW v_detail_transaksi AS
SELECT pb.id_pembelian,
       pb.no_transaksi,
       pb.tgl_pembelian,
       COALESCE(pl.nama, 'Pembeli umum') AS pelanggan,
       pj.id_penjualan,
       b.judul,
       pj.quantity,
       pj.harga_satuan,
       pj.subtotal,
       pb.total AS total_nota,
       a.nama   AS diproses_oleh
  FROM penjualan pj
  JOIN pembelian pb      ON pb.id_pembelian = pj.id_pembelian
  JOIN buku b            ON b.id_buku       = pj.id_buku
  JOIN admin a           ON a.id_admin      = pj.id_admin
  LEFT JOIN pelanggan pl ON pl.id_pelanggan = pb.id_pelanggan;

CREATE VIEW v_stok_menipis AS
SELECT id_buku, judul, stok, suplier
  FROM buku
 WHERE stok <= 5
 ORDER BY stok ASC, judul;

CREATE VIEW v_buku_terlaris AS
SELECT b.id_buku,
       b.judul,
       SUM(pj.quantity) AS total_terjual,
       SUM(pj.subtotal) AS total_pendapatan
  FROM penjualan pj
  JOIN buku b ON b.id_buku = pj.id_buku
 GROUP BY b.id_buku, b.judul
 ORDER BY total_terjual DESC;

CREATE VIEW v_pendapatan_bulanan AS
SELECT DATE_TRUNC('month', tgl_pembelian)::DATE AS bulan,
       COUNT(*)   AS jumlah_transaksi,
       SUM(total) AS total_pendapatan
  FROM pembelian
 GROUP BY 1
 ORDER BY 1 DESC;

CREATE VIEW v_kinerja_admin AS
SELECT a.id_admin,
       a.nama,
       COUNT(DISTINCT pj.id_pembelian) AS transaksi_diproses,
       COALESCE(SUM(pj.subtotal), 0)   AS nilai_penjualan
  FROM admin a
  LEFT JOIN penjualan pj ON pj.id_admin = a.id_admin
 GROUP BY a.id_admin, a.nama
 ORDER BY nilai_penjualan DESC;
```

### 9.4 Fungsi pembuat transaksi (dipanggil dari API)

Satu pemanggilan = satu transaksi database. Jika satu item gagal (misalnya stok kurang), seluruh nota dibatalkan otomatis.

```sql
-- file: db/migrations/004_functions.sql
CREATE FUNCTION fn_buat_transaksi(
    p_id_pelanggan INT,
    p_id_admin     INT,
    p_items        JSONB
) RETURNS TABLE (out_id_pembelian INT, out_no_transaksi VARCHAR, out_total NUMERIC) AS $$
DECLARE
    v_id  INT;
    v_no  VARCHAR(30);
    v_tgl DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Item transaksi tidak boleh kosong';
    END IF;

    v_no := 'TRX-' || to_char(v_tgl, 'YYYYMMDD') || '-' || lpad(nextval('seq_no_transaksi')::text, 6, '0');

    INSERT INTO pembelian (no_transaksi, tgl_pembelian, id_pelanggan)
    VALUES (v_no, v_tgl, p_id_pelanggan)
    RETURNING pembelian.id_pembelian INTO v_id;

    INSERT INTO penjualan (id_pembelian, id_buku, id_admin, quantity)
    SELECT v_id, (i->>'id_buku')::INT, p_id_admin, (i->>'quantity')::INT
      FROM jsonb_array_elements(p_items) AS i;

    RETURN QUERY
    SELECT p.id_pembelian, p.no_transaksi, p.total
      FROM pembelian p
     WHERE p.id_pembelian = v_id;
END;
$$ LANGUAGE plpgsql;
```

### 9.5 Data contoh (hanya untuk branch `dev`)

Jangan jalankan seed ini di production. Akun admin dibuat terpisah lewat `npm run seed:admin` agar password ter-hash dengan benar.

```sql
-- file: db/seeds/001_dev_seed.sql
INSERT INTO pelanggan (nama, email, no_hp, gender, alamat) VALUES
    ('Budi Santoso', 'budi@example.com', '081234567890', 'Laki-laki', 'Jl. Malioboro No. 1, Yogyakarta'),
    ('Siti Aminah',  'siti@example.com', '082345678901', 'Perempuan', 'Jl. Kaliurang Km 5, Sleman'),
    ('Dewi Lestari', 'dewi@example.com', '083456789012', 'Perempuan', 'Jl. Parangtritis No. 20, Bantul');

INSERT INTO buku (judul, pengarang, harga, stok, genre, penerbit, suplier) VALUES
    ('Laskar Pelangi',         'Andrea Hirata',     89000.00,  20, 'Novel',     'Bentang Pustaka',   'CV Buku Nusantara'),
    ('Bumi Manusia',           'Pramoedya A. Toer', 120000.00, 15, 'Novel',     'Lentera Dipantara', 'CV Buku Nusantara'),
    ('Filosofi Teras',         'Henry Manampiring', 98000.00,  12, 'Self-help', 'Kompas',            'PT Distribusi Pustaka'),
    ('Atomic Habits',          'James Clear',       110000.00, 4,  'Self-help', 'Gramedia',          'PT Distribusi Pustaka'),
    ('Dasar-Dasar Basis Data', 'Rudi Hartono',      75000.00,  10, 'Teknologi', 'Informatika',       'CV Buku Nusantara');
```

### 9.6 Skrip migrasi

```bash
# file: scripts/migrate.sh
#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
[ -n "$URL" ] || { echo "Set DATABASE_URL_UNPOOLED (atau DATABASE_URL) dulu."; exit 1; }

psql "$URL" -v ON_ERROR_STOP=1 -q -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"

for f in db/migrations/*.sql; do
  name="$(basename "$f")"
  applied="$(psql "$URL" -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '$name'")"
  if [ -z "$applied" ]; then
    echo "Menjalankan $name"
    psql "$URL" -v ON_ERROR_STOP=1 -q --single-transaction -f "$f" -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
  else
    echo "Lewati $name (sudah dijalankan)"
  fi
done

echo "Migrasi selesai."
```

### 9.7 Skrip membuat akun admin

```js
// file: scripts/seed-admin.mjs
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('Set DATABASE_URL, ADMIN_USERNAME, dan ADMIN_PASSWORD di .env.local');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD minimal 8 karakter');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

await sql`
  INSERT INTO admin (nama, username, password_hash, role)
  VALUES ('Administrator', ${ADMIN_USERNAME}, ${hash}, 'admin')
  ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
`;

console.log(`Admin "${ADMIN_USERNAME}" siap dipakai.`);
```

### 9.8 Mengulang dari nol (hanya branch dev)

Cara termudah di Neon: **reset branch `dev` dari parent** lewat dashboard, lalu `npm run migrate` lagi. Alternatif lewat SQL (jangan pernah dijalankan di production):

```sql-example
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

---

## 10. Backend: Vercel Functions

Setiap file di `api/` menjadi endpoint. File dan folder berawalan `_` (seperti `_lib`) tidak dijadikan endpoint. Proyek memakai ESM (`"type": "module"` sudah ada dari template Vite).

### 10.1 Koneksi database

```js
// file: api/_lib/db.js
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diset');
}

// Mode HTTP: cocok untuk serverless, satu request = satu panggilan.
export const sql = neon(process.env.DATABASE_URL);
```

### 10.2 Helper HTTP

```js
// file: api/_lib/http.js
export function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Method tidak diizinkan' });
  return false;
}

export function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function fail(res, err) {
  // P0001 = RAISE EXCEPTION dari trigger/fungsi (aturan bisnis, mis. stok kurang)
  if (err?.code === 'P0001') return res.status(409).json({ error: err.message });
  if (err?.code === '23505') return res.status(409).json({ error: 'Data duplikat' });
  if (err?.code === '23503') return res.status(409).json({ error: 'Data masih dipakai data lain' });
  if (err?.code === '23514') return res.status(400).json({ error: 'Nilai tidak memenuhi aturan data' });
  console.error(err);
  return res.status(500).json({ error: 'Terjadi kesalahan server' });
}
```

### 10.3 Autentikasi (JWT di cookie httpOnly)

```js
// file: api/_lib/auth.js
import { SignJWT, jwtVerify } from 'jose';

const MAX_AGE = 60 * 60 * 8; // 8 jam

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET belum diset');
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
}

export async function getSession(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id_admin: Number(payload.sub), nama: payload.nama, role: payload.role };
  } catch {
    return null;
  }
}

// Mengembalikan sesi, atau mengirim 401/403 dan mengembalikan null.
export async function requireAuth(req, res, roles = null) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Belum login' });
    return null;
  }
  if (roles && !roles.includes(session.role)) {
    res.status(403).json({ error: 'Tidak punya akses' });
    return null;
  }
  return session;
}
```

### 10.4 Endpoint auth

```js
// file: api/auth/login.js
import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { signToken, setSessionCookie } from '../_lib/auth.js';
import { allow, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;

  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const rows = await sql`
      SELECT id_admin, nama, username, password_hash, role
        FROM admin WHERE username = ${username}`;
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(password, admin.password_hash));
    if (!ok) return res.status(401).json({ error: 'Username atau password salah' });

    const token = await signToken({ sub: String(admin.id_admin), nama: admin.nama, role: admin.role });
    setSessionCookie(res, token);
    return res.status(200).json({ id_admin: admin.id_admin, nama: admin.nama, role: admin.role });
  } catch (err) {
    return fail(res, err);
  }
}
```

```js
// file: api/auth/logout.js
import { clearSessionCookie } from '../_lib/auth.js';
import { allow } from '../_lib/http.js';

export default function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
```

```js
// file: api/auth/me.js
import { requireAuth } from '../_lib/auth.js';
import { allow } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  const session = await requireAuth(req, res);
  if (!session) return;
  res.status(200).json(session);
}
```

### 10.5 Endpoint buku

```js
// file: api/buku/index.js
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail, toInt } from '../_lib/http.js';

function validasi(b) {
  const harga = Number(b.harga);
  const stok = toInt(b.stok);
  if (typeof b.judul !== 'string' || !b.judul.trim()) return 'Judul wajib diisi';
  if (!Number.isFinite(harga) || harga < 0) return 'Harga tidak valid';
  if (stok === null || stok < 0) return 'Stok tidak valid';
  return null;
}

export default async function handler(req, res) {
  if (!allow(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return;

  // Baca: semua admin. Tulis: hanya role admin.
  const roles = req.method === 'GET' ? null : ['admin'];
  const session = await requireAuth(req, res, roles);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const q = typeof req.query.q === 'string' ? `%${req.query.q}%` : '%';
      const rows = await sql`
        SELECT id_buku, judul, pengarang, harga, stok, genre, penerbit, suplier
          FROM buku
         WHERE judul ILIKE ${q} OR pengarang ILIKE ${q}
         ORDER BY judul
         LIMIT 200`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = req.body ?? {};
      const err = validasi(b);
      if (err) return res.status(400).json({ error: err });
      const rows = await sql`
        INSERT INTO buku (judul, pengarang, harga, stok, genre, penerbit, suplier)
        VALUES (${b.judul.trim()}, ${b.pengarang ?? null}, ${b.harga}, ${b.stok},
                ${b.genre ?? null}, ${b.penerbit ?? null}, ${b.suplier ?? null})
        RETURNING *`;
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const b = req.body ?? {};
      const id = toInt(b.id_buku);
      const err = id === null ? 'id_buku tidak valid' : validasi(b);
      if (err) return res.status(400).json({ error: err });
      const rows = await sql`
        UPDATE buku
           SET judul = ${b.judul.trim()}, pengarang = ${b.pengarang ?? null}, harga = ${b.harga},
               stok = ${b.stok}, genre = ${b.genre ?? null}, penerbit = ${b.penerbit ?? null},
               suplier = ${b.suplier ?? null}
         WHERE id_buku = ${id}
         RETURNING *`;
      if (!rows[0]) return res.status(404).json({ error: 'Buku tidak ditemukan' });
      return res.status(200).json(rows[0]);
    }

    // DELETE ?id=123
    const id = toInt(req.query.id);
    if (id === null) return res.status(400).json({ error: 'id tidak valid' });
    const rows = await sql`DELETE FROM buku WHERE id_buku = ${id} RETURNING id_buku`;
    if (!rows[0]) return res.status(404).json({ error: 'Buku tidak ditemukan' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return fail(res, err);
  }
}
```

### 10.6 Endpoint pelanggan

```js
// file: api/pelanggan/index.js
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET', 'POST'])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const q = typeof req.query.q === 'string' ? `%${req.query.q}%` : '%';
      const rows = await sql`
        SELECT id_pelanggan, nama, email, no_hp, gender, alamat
          FROM pelanggan
         WHERE nama ILIKE ${q} OR email ILIKE ${q} OR no_hp ILIKE ${q}
         ORDER BY nama
         LIMIT 200`;
      return res.status(200).json(rows);
    }

    const p = req.body ?? {};
    if (typeof p.nama !== 'string' || !p.nama.trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' });
    }
    const rows = await sql`
      INSERT INTO pelanggan (nama, email, no_hp, gender, alamat)
      VALUES (${p.nama.trim()}, ${p.email || null}, ${p.no_hp || null}, ${p.gender || null}, ${p.alamat || null})
      RETURNING *`;
    return res.status(201).json(rows[0]);
  } catch (err) {
    return fail(res, err);
  }
}
```

### 10.7 Endpoint transaksi

```js
// file: api/transaksi/index.js
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail, toInt } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET', 'POST', 'DELETE'])) return;

  // Membatalkan nota hanya boleh role admin.
  const roles = req.method === 'DELETE' ? ['admin'] : null;
  const session = await requireAuth(req, res, roles);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const id = req.query.id !== undefined ? toInt(req.query.id) : undefined;
      if (id === null) return res.status(400).json({ error: 'id tidak valid' });

      if (id !== undefined) {
        const rows = await sql`
          SELECT * FROM v_detail_transaksi WHERE id_pembelian = ${id} ORDER BY id_penjualan`;
        if (!rows.length) return res.status(404).json({ error: 'Nota tidak ditemukan' });
        return res.status(200).json(rows);
      }

      const rows = await sql`
        SELECT pb.id_pembelian, pb.no_transaksi, pb.tgl_pembelian, pb.total,
               COALESCE(pl.nama, 'Pembeli umum') AS pelanggan
          FROM pembelian pb
          LEFT JOIN pelanggan pl ON pl.id_pelanggan = pb.id_pelanggan
         ORDER BY pb.id_pembelian DESC
         LIMIT 50`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { id_pelanggan, items } = req.body ?? {};
      const idPelanggan = id_pelanggan == null ? null : toInt(id_pelanggan);

      if (id_pelanggan != null && idPelanggan === null) {
        return res.status(400).json({ error: 'id_pelanggan tidak valid' });
      }
      if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ error: 'items wajib berisi 1 sampai 50 buku' });
      }

      const bersih = [];
      for (const it of items) {
        const idBuku = toInt(it?.id_buku);
        const quantity = toInt(it?.quantity);
        if (idBuku === null || quantity === null || quantity <= 0) {
          return res.status(400).json({ error: 'Setiap item butuh id_buku dan quantity > 0' });
        }
        bersih.push({ id_buku: idBuku, quantity });
      }

      const rows = await sql`
        SELECT out_id_pembelian AS id_pembelian,
               out_no_transaksi AS no_transaksi,
               out_total        AS total
          FROM fn_buat_transaksi(${idPelanggan}::int, ${session.id_admin}::int, ${JSON.stringify(bersih)}::jsonb)`;
      return res.status(201).json(rows[0]);
    }

    // DELETE ?id=123 : batalkan nota, stok kembali otomatis
    const id = toInt(req.query.id);
    if (id === null) return res.status(400).json({ error: 'id tidak valid' });
    const rows = await sql`DELETE FROM pembelian WHERE id_pembelian = ${id} RETURNING id_pembelian`;
    if (!rows[0]) return res.status(404).json({ error: 'Nota tidak ditemukan' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return fail(res, err);
  }
}
```

### 10.8 Endpoint laporan

```js
// file: api/laporan/index.js
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    switch (req.query.jenis) {
      case 'terlaris':
        return res.status(200).json(await sql`SELECT * FROM v_buku_terlaris LIMIT 20`);
      case 'stok':
        return res.status(200).json(await sql`SELECT * FROM v_stok_menipis`);
      case 'bulanan':
        return res.status(200).json(await sql`SELECT * FROM v_pendapatan_bulanan LIMIT 24`);
      case 'admin':
        return res.status(200).json(await sql`SELECT * FROM v_kinerja_admin`);
      default:
        return res.status(400).json({ error: 'jenis harus: terlaris | stok | bulanan | admin' });
    }
  } catch (err) {
    return fail(res, err);
  }
}
```

---

## 11. Kontrak API

Semua endpoint berada di domain yang sama dengan frontend. Respons selalu JSON; error berbentuk `{ "error": "pesan" }`. Autentikasi memakai cookie `token` (httpOnly), jadi frontend cukup memanggil `fetch` tanpa mengatur header khusus.

| Method | Path | Hak akses | Body / query | Respons sukses |
|---|---|---|---|---|
| POST | `/api/auth/login` | publik | `{username, password}` | 200 `{id_admin, nama, role}` + cookie |
| POST | `/api/auth/logout` | publik | - | 200 `{ok:true}` |
| GET | `/api/auth/me` | login | - | 200 `{id_admin, nama, role}` |
| GET | `/api/buku?q=` | login | cari judul/pengarang | 200 `[buku]` |
| POST | `/api/buku` | admin | `{judul, pengarang?, harga, stok, genre?, penerbit?, suplier?}` | 201 buku |
| PUT | `/api/buku` | admin | seperti POST + `id_buku` | 200 buku |
| DELETE | `/api/buku?id=` | admin | - | 200 `{ok:true}` |
| GET | `/api/pelanggan?q=` | login | cari nama/email/HP | 200 `[pelanggan]` |
| POST | `/api/pelanggan` | login | `{nama, email?, no_hp?, gender?, alamat?}` | 201 pelanggan |
| GET | `/api/transaksi` | login | - | 200 50 nota terbaru |
| GET | `/api/transaksi?id=` | login | - | 200 `[baris v_detail_transaksi]` |
| POST | `/api/transaksi` | login | `{id_pelanggan?, items:[{id_buku, quantity}]}` | 201 `{id_pembelian, no_transaksi, total}` |
| DELETE | `/api/transaksi?id=` | admin | - | 200 `{ok:true}` (stok kembali) |
| GET | `/api/laporan?jenis=` | login | `terlaris`, `stok`, `bulanan`, `admin` | 200 baris laporan |

Kode status: 400 input tidak valid, 401 belum login, 403 tidak punya akses, 404 tidak ditemukan, 405 method salah, 409 aturan bisnis/duplikat (contoh: stok tidak cukup), 500 kesalahan server.

---

## 12. Frontend: React

Halaman di bawah adalah kerangka minimal yang berjalan. Halaman lain (kelola buku, pelanggan, laporan, riwayat nota) mengikuti pola yang sama dan bisa dibuat dengan Copilot memakai [kontrak API](#11-kontrak-api) dan [konteks AI](#3-konteks-untuk-ai--copilot).

### 12.1 Pembungkus fetch

```js
// file: src/lib/api.js
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
```

### 12.2 Router dan sesi

```jsx
// file: src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import Login from './pages/Login';
import Kasir from './pages/Kasir';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = memeriksa, null = belum login

  useEffect(() => {
    api.get('/auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  if (user === undefined) return <p>Memuat...</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
        <Route path="/" element={user ? <Kasir user={user} onLogout={logout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 12.3 Halaman login

```jsx
// file: src/pages/Login.jsx
import { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await api.post('/auth/login', { username, password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '4rem auto', display: 'grid', gap: 12 }}>
      <h1>Login Admin</h1>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</button>
    </form>
  );
}
```

### 12.4 Halaman kasir (buat transaksi)

```jsx
// file: src/pages/Kasir.jsx
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Kasir({ user, onLogout }) {
  const [buku, setBuku] = useState([]);
  const [pelanggan, setPelanggan] = useState([]);
  const [idPelanggan, setIdPelanggan] = useState('');
  const [keranjang, setKeranjang] = useState({}); // { id_buku: quantity }
  const [pesan, setPesan] = useState(null);
  const [loading, setLoading] = useState(false);

  async function muat() {
    const [b, p] = await Promise.all([api.get('/buku'), api.get('/pelanggan')]);
    setBuku(b);
    setPelanggan(p);
  }
  useEffect(() => { muat().catch((e) => setPesan({ error: e.message })); }, []);

  const total = useMemo(
    () => buku.reduce((sum, b) => sum + (keranjang[b.id_buku] || 0) * Number(b.harga), 0),
    [buku, keranjang]
  );

  function ubah(idBuku, qty) {
    setKeranjang((k) => {
      const next = { ...k };
      if (qty > 0) next[idBuku] = qty; else delete next[idBuku];
      return next;
    });
  }

  async function bayar() {
    const items = Object.entries(keranjang).map(([id, quantity]) => ({ id_buku: Number(id), quantity }));
    if (!items.length) return setPesan({ error: 'Keranjang masih kosong' });
    setLoading(true);
    setPesan(null);
    try {
      const hasil = await api.post('/transaksi', {
        id_pelanggan: idPelanggan ? Number(idPelanggan) : null,
        items,
      });
      setPesan({ ok: `Nota ${hasil.no_transaksi} dibuat. Total ${rupiah(hasil.total)}` });
      setKeranjang({});
      await muat(); // stok terbaru
    } catch (e) {
      setPesan({ error: e.message }); // mis. "Stok buku id 4 tidak cukup ..."
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Kasir</h1>
        <span>{user.nama} ({user.role}) <button onClick={onLogout}>Keluar</button></span>
      </header>

      <label>
        Pelanggan:{' '}
        <select value={idPelanggan} onChange={(e) => setIdPelanggan(e.target.value)}>
          <option value="">Pembeli umum</option>
          {pelanggan.map((p) => <option key={p.id_pelanggan} value={p.id_pelanggan}>{p.nama}</option>)}
        </select>
      </label>

      <table style={{ width: '100%', marginTop: 16 }}>
        <thead><tr><th align="left">Judul</th><th>Harga</th><th>Stok</th><th>Qty</th></tr></thead>
        <tbody>
          {buku.map((b) => (
            <tr key={b.id_buku}>
              <td>{b.judul}</td>
              <td align="right">{rupiah(b.harga)}</td>
              <td align="center">{b.stok}</td>
              <td align="center">
                <input type="number" min="0" max={b.stok} style={{ width: 64 }}
                  value={keranjang[b.id_buku] || 0}
                  onChange={(e) => ubah(b.id_buku, Number(e.target.value))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Total: {rupiah(total)}</h2>
      <button onClick={bayar} disabled={loading}>{loading ? 'Memproses...' : 'Buat transaksi'}</button>
      {pesan?.ok && <p style={{ color: 'green' }}>{pesan.ok}</p>}
      {pesan?.error && <p style={{ color: 'crimson' }}>{pesan.error}</p>}
    </main>
  );
}
```

Catatan: harga yang tampil di keranjang hanya perkiraan. Harga final dan total ditentukan database saat transaksi dibuat.

---

## 13. Konfigurasi file pendukung

### 13.1 `vercel.json` (buat manual)

```json
{
  "regions": ["sin1"],
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- `rewrites` membuat refresh di rute React (misalnya `/login`) tidak menghasilkan 404, sementara `/api/...` tetap menuju Functions.
- `regions` memindahkan Functions ke Singapura (`sin1`) agar dekat dengan database Neon di Singapore. Sesuaikan dengan region Neon-mu dan pastikan plan Vercel-mu mengizinkan pemilihan region.

### 13.2 `package.json` (pastikan bagian ini ada)

```json
{
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "migrate": "bash scripts/migrate.sh",
    "seed:admin": "node --env-file=.env.local scripts/seed-admin.mjs"
  }
}
```

Perintah `npm pkg set` di bagian 5.4 menambahkan skrip `migrate` dan `seed:admin` secara otomatis.

### 13.3 Contoh environment

Nilai diberi tanda kutip karena connection string mengandung karakter `&` yang bermakna khusus di shell.

```
# file: .env.example
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="ganti-dengan-string-acak-minimal-32-karakter"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="ganti-dengan-password-kuat"
```

### 13.4 GitHub Actions: CI

```yaml
# file: .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run build
```

### 13.5 GitHub Actions: migrasi manual

Dijalankan dari tab **Actions** di GitHub (tombol *Run workflow*). Migrasi production sengaja dibuat manual supaya tidak ada perubahan skema yang berjalan tanpa disadari.

```yaml
# file: .github/workflows/migrate.yml
name: Migrate database
on:
  workflow_dispatch:
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/migrate.sh
        env:
          DATABASE_URL_UNPOOLED: ${{ secrets.DATABASE_URL_UNPOOLED }}
```

Tambahkan secret `DATABASE_URL_UNPOOLED` (connection string unpooled branch production) di **GitHub, Settings, Secrets and variables, Actions**.

---

## 14. Deploy: GitHub, Vercel, Neon

### 14.1 Strategi branch

| Git branch | Neon branch | Vercel environment | Tujuan |
|---|---|---|---|
| `main` | `main` | Production | Aplikasi yang dipakai pengguna |
| `feature/*` (PR) | `dev` (atau branch per PR) | Preview | Uji sebelum merge |
| lokal | `dev` | `vercel dev` | Pengembangan |

### 14.2 Langkah deploy pertama

1. Buat repositori di GitHub, lalu push proyek:

```bash
git init
git add .
git commit -m "Initial commit: toko buku"
git branch -M main
git remote add origin https://github.com/USERNAME/toko-buku.git
git push -u origin main
```

2. Di Vercel: **Add New, Project**, impor repositori. Framework terdeteksi sebagai Vite (build `npm run build`, output `dist`).
3. Isi **Environment Variables** di Vercel (Production dan Preview):
   - `DATABASE_URL` = connection string **pooled** Neon
   - `JWT_SECRET` = string acak panjang (berbeda dari lokal)

   Alternatif: pasang integrasi **Neon di Vercel Marketplace** yang menyuntikkan variabel database otomatis. Cek nama variabel yang dibuat di dashboard Vercel dan samakan dengan `DATABASE_URL` yang dipakai kode.
4. Jalankan migrasi ke database production, lewat salah satu cara:

```bash
# dari laptop, dengan DATABASE_URL_UNPOOLED production di shell
DATABASE_URL_UNPOOLED="postgresql://...production..." bash scripts/migrate.sh
```

   atau jalankan workflow **Migrate database** di GitHub Actions.
5. Buat akun admin production:

```bash
DATABASE_URL="postgresql://...production..." ADMIN_USERNAME="admin" ADMIN_PASSWORD="password-kuat-anda" \
  node scripts/seed-admin.mjs
```

6. Deploy (otomatis saat push ke `main`) dan buka domain Vercel.

### 14.3 Alur kerja harian

1. Buat branch, ubah kode. Jika skema berubah, tambah `db/migrations/005_xxx.sql`.
2. `npm run migrate` di branch Neon `dev`, uji lewat `vercel dev`.
3. Buka PR. GitHub Actions menjalankan build; Vercel membuat Preview URL.
4. Setelah merge ke `main`, jalankan migrasi production (workflow manual), lalu Vercel deploy otomatis.

Urutan penting: **migrasi database dulu, kode baru kemudian**, dan buat perubahan skema yang kompatibel dengan kode lama (misalnya menambah kolom, bukan langsung menghapus).

### 14.4 Catatan khusus Neon

- **Cold start**: compute Neon di paket gratis dapat berhenti saat tidak dipakai, sehingga request pertama setelah idle terasa lebih lambat. Ini normal.
- **Pooled vs unpooled**: pooled (`-pooler`) untuk aplikasi, unpooled untuk migrasi (`psql`, perubahan skema).
- **Branching**: manfaatkan branch `dev` agar eksperimen tidak menyentuh data production. Branch bisa di-reset dari parent.
- **Batas dan harga** berubah dari waktu ke waktu; cek halaman pricing Neon dan Vercel sebelum memutuskan paket.

---

## 15. Contoh query dan pengujian

Blok `sql-example` tidak diekstrak otomatis. Jalankan di **Neon SQL Editor** atau `psql`.

### 15.1 Transaksi demo (setelah `seed:admin` dan seed dev)

Admin yang dibuat `seed:admin` pada database baru bernilai `id_admin = 1`.

```sql-example
SELECT * FROM fn_buat_transaksi(
  1,
  1,
  '[{"id_buku":1,"quantity":2},{"id_buku":4,"quantity":1}]'::jsonb
);
-- Harapan: total = 288000.00  (2 x 89.000 + 1 x 110.000)
```

### 15.2 Pengujian aturan bisnis

```sql-example
-- Stok berkurang otomatis. Harapan: Laskar Pelangi 18, Atomic Habits 3
SELECT id_buku, judul, stok FROM buku ORDER BY id_buku;

-- Stok tidak cukup harus ditolak
SELECT * FROM fn_buat_transaksi(NULL, 1, '[{"id_buku":4,"quantity":999}]'::jsonb);
-- Harapan: ERROR  Stok buku id 4 tidak cukup (tersedia 3, diminta 999)

-- Nota kosong harus ditolak
SELECT * FROM fn_buat_transaksi(NULL, 1, '[]'::jsonb);
-- Harapan: ERROR  Item transaksi tidak boleh kosong

-- UPDATE rincian harus ditolak
UPDATE penjualan SET quantity = 5 WHERE id_penjualan = 1;
-- Harapan: ERROR  Baris penjualan tidak boleh diubah. Hapus lalu buat ulang.

-- Subtotal tidak bisa diisi manual
INSERT INTO penjualan (id_pembelian, id_buku, id_admin, quantity, subtotal) VALUES (1, 1, 1, 1, 1);
-- Harapan: ERROR  cannot insert a non-DEFAULT value into column "subtotal"

-- Hapus item mengembalikan stok dan menghitung ulang total
BEGIN;
DELETE FROM penjualan WHERE id_penjualan = 1;       -- 2 x Laskar Pelangi
SELECT stok FROM buku WHERE id_buku = 1;            -- Harapan: 20
SELECT total FROM pembelian WHERE id_pembelian = 1; -- Harapan: 110000.00
ROLLBACK;
```

### 15.3 Query laporan dan operasional

```sql-example
SELECT * FROM v_detail_transaksi WHERE no_transaksi = 'TRX-20261022-000001';
SELECT * FROM v_buku_terlaris;
SELECT * FROM v_stok_menipis;
SELECT * FROM v_pendapatan_bulanan;
SELECT * FROM v_kinerja_admin;

-- Omzet hari ini (zona Jakarta)
SELECT COUNT(*) AS jumlah_nota, COALESCE(SUM(total), 0) AS omzet
  FROM pembelian
 WHERE tgl_pembelian = (now() AT TIME ZONE 'Asia/Jakarta')::date;

-- Pelanggan dengan belanja terbesar
SELECT pl.nama, COUNT(pb.id_pembelian) AS jumlah_transaksi, SUM(pb.total) AS total_belanja
  FROM pelanggan pl JOIN pembelian pb ON pb.id_pelanggan = pl.id_pelanggan
 GROUP BY pl.id_pelanggan, pl.nama
 ORDER BY total_belanja DESC LIMIT 10;

-- Restock manual
UPDATE buku SET stok = stok + 20 WHERE id_buku = 4;
```

### 15.4 Uji API dengan curl (setelah `vercel dev` berjalan)

```bash
# login dan simpan cookie
curl -i -c cookie.txt -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password-anda"}' \
  http://localhost:3000/api/auth/login

# daftar buku
curl -b cookie.txt http://localhost:3000/api/buku

# buat transaksi
curl -b cookie.txt -H "Content-Type: application/json" \
  -d '{"id_pelanggan":1,"items":[{"id_buku":3,"quantity":1}]}' \
  http://localhost:3000/api/transaksi
```

Catatan: cookie bertanda `Secure` bisa tidak terkirim lewat `curl` ke `http://localhost`. Jika begitu, kirim token manual dengan header `Cookie: token=...` yang diambil dari respons login.

---

## 16. Keamanan

Daftar periksa sebelum production:

- [ ] `DATABASE_URL` dan `JWT_SECRET` hanya ada di environment server (Vercel) dan `.env.local`; **tidak** ada di Git (`.env*.local` ada di `.gitignore`) dan **tidak** berawalan `VITE_`.
- [ ] Password admin disimpan sebagai hash bcrypt; password default contoh sudah diganti.
- [ ] `JWT_SECRET` production berbeda dengan lokal, panjang, dan acak.
- [ ] Semua query memakai tagged template `sql\`...\`` (parameterized). Tidak ada penyambungan string SQL.
- [ ] Endpoint tulis sensitif (ubah buku, batalkan nota) dibatasi role `admin`.
- [ ] Pertimbangkan pembatasan percobaan login (rate limiting) untuk mencegah tebak password, misalnya lewat Vercel Firewall atau penyimpanan hitungan percobaan.
- [ ] Gunakan role Postgres khusus aplikasi dengan hak terbatas untuk `DATABASE_URL` (buat di Neon, lalu `GRANT` seperlunya) dan simpan role pemilik skema hanya untuk migrasi.
- [ ] Aktifkan 2FA di akun GitHub, Vercel, dan Neon.
- [ ] Jangan men-commit file `.env`, dump database, atau hasil `vercel env pull`.

---

## 17. Catatan review diagram dan rencana pengembangan

### 17.1 Perbedaan diagram asli dan implementasi

| # | Temuan pada diagram | Penanganan |
|---|---|---|
| 1 | PK tabel Admin tertulis `id_pelanggan` | Diganti `id_admin` |
| 2 | Kolom `pasword` / `pesword` | Menjadi `password_hash` (berisi hash) |
| 3 | `suplier` muncul dua kali di entitas Buku pada ERD | Satu kolom `suplier` |
| 4 | `pengarang` / `pengaranng` tidak konsisten | `pengarang` |
| 5 | `tgl_penjualan` ada di tabel Pembelian | `tgl_pembelian` |
| 6 | Judul "Kredensial" berisi daftar relasi | Dipindah ke bagian 8 |
| 7 | Notasi relasi Pembelian ke Penjualan ambigu | Dibakukan 1:N |
| 8 | `genre`, `penerbit`, `suplier` teks bebas | Dipertahankan; lihat 17.2 |

Dua hal yang perlu kamu putuskan:

- Nama tabel `penjualan` untuk baris rincian tidak lazim (umumnya `detail_pembelian`). Dipertahankan agar sesuai diagram.
- `id_admin` ada di rincian (`penjualan`), bukan di nota (`pembelian`). Jika satu nota selalu diproses satu admin, lebih sederhana memindahkannya ke `pembelian`.

### 17.2 Normalisasi lanjutan (migrasi 005, opsional)

Menjadikan genre, penerbit, dan suplier tabel terpisah agar data konsisten dan bisa menyimpan alamat/kontak. Simpan sebagai migrasi baru bila ingin dipakai (blok ini tidak diekstrak otomatis). Setelah itu sesuaikan `api/buku/index.js` dan `v_stok_menipis`.

```sql-example
-- db/migrations/005_normalisasi_buku.sql
CREATE TABLE genre    (id_genre SERIAL PRIMARY KEY, nama_genre VARCHAR(50) NOT NULL UNIQUE);
CREATE TABLE penerbit (id_penerbit SERIAL PRIMARY KEY, nama VARCHAR(100) NOT NULL UNIQUE, alamat TEXT);
CREATE TABLE suplier  (id_suplier SERIAL PRIMARY KEY, nama VARCHAR(100) NOT NULL UNIQUE, kontak VARCHAR(50), alamat TEXT);

INSERT INTO genre (nama_genre) SELECT DISTINCT genre    FROM buku WHERE genre    IS NOT NULL;
INSERT INTO penerbit (nama)    SELECT DISTINCT penerbit FROM buku WHERE penerbit IS NOT NULL;
INSERT INTO suplier (nama)     SELECT DISTINCT suplier  FROM buku WHERE suplier  IS NOT NULL;

ALTER TABLE buku
    ADD COLUMN id_genre    INT REFERENCES genre(id_genre),
    ADD COLUMN id_penerbit INT REFERENCES penerbit(id_penerbit),
    ADD COLUMN id_suplier  INT REFERENCES suplier(id_suplier);

UPDATE buku b SET id_genre    = g.id_genre    FROM genre g    WHERE g.nama_genre = b.genre;
UPDATE buku b SET id_penerbit = p.id_penerbit FROM penerbit p WHERE p.nama       = b.penerbit;
UPDATE buku b SET id_suplier  = s.id_suplier  FROM suplier s  WHERE s.nama       = b.suplier;

DROP VIEW v_stok_menipis;
ALTER TABLE buku DROP COLUMN genre, DROP COLUMN penerbit, DROP COLUMN suplier;

CREATE VIEW v_stok_menipis AS
SELECT b.id_buku, b.judul, b.stok, s.nama AS suplier
  FROM buku b LEFT JOIN suplier s ON s.id_suplier = b.id_suplier
 WHERE b.stok <= 5
 ORDER BY b.stok ASC, b.judul;
```

### 17.3 Ide pengembangan

- Tabel `pembelian_stok` dan `detail_pembelian_stok` untuk pembelian stok dari suplier (saat ini restock manual).
- Kolom `status` (`pending`, `lunas`, `batal`) dan `metode_bayar` pada `pembelian`.
- Kolom `aktif BOOLEAN` pada `buku` dan `admin` untuk penonaktifan tanpa menghapus.
- Kolom ISBN (UNIQUE) pada `buku`.
- Halaman riwayat nota, kelola buku/pelanggan, dan dashboard laporan.
- Migrasi ke TypeScript dan Drizzle ORM bila proyek membesar.

---

## 18. Pemecahan masalah

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `DATABASE_URL belum diset` di log Vercel | Environment variable belum diisi untuk environment itu | Tambahkan di Vercel (Production dan Preview), lalu redeploy |
| API 404 saat `npm run dev` | `vite dev` tidak menjalankan folder `api/` | Gunakan `vercel dev` |
| 401 terus setelah login di localhost | Cookie `Secure` pada HTTP | Pakai `vercel dev` di browser (localhost dikecualikan Chrome/Firefox); untuk `curl`, kirim header `Cookie` manual |
| Refresh halaman `/login` di production menghasilkan 404 | `vercel.json` belum punya rewrite SPA | Tambahkan bagian `rewrites` dari 13.1 |
| `Stok buku id X tidak cukup` (HTTP 409) | Jumlah melebihi stok | Kurangi jumlah atau restock |
| `Baris penjualan tidak boleh diubah` | Ada UPDATE pada `penjualan` | Hapus baris lalu buat ulang |
| `cannot insert a non-DEFAULT value into column "subtotal"` | Kolom `subtotal` GENERATED | Jangan kirim `subtotal` |
| `violates foreign key constraint ... RESTRICT` | Buku/admin sudah punya riwayat transaksi | Nonaktifkan di aplikasi, jangan hapus |
| Request pertama lambat setelah lama idle | Compute Neon sedang berhenti (autosuspend) | Normal; request berikutnya cepat |
| `relation "buku" already exists` saat migrasi | Migrasi dijalankan manual di luar `schema_migrations` | Reset branch dev lalu `npm run migrate`; jangan jalankan file SQL manual di production |
| `npm run migrate` gagal `psql: command not found` | Klien PostgreSQL belum terpasang | Pasang `postgresql-client` (Windows: lewat WSL) |
| Ekstraksi `awk` menghasilkan file kosong | README berakhir baris CRLF atau baris pertama blok bukan `file:` | `sed -i 's/\r$//' Ai_direc.md`, pastikan penanda berada di baris pertama blok |
| `ERR_MODULE_NOT_FOUND` di Functions | Import relatif tanpa ekstensi | Tulis `.js` pada import relatif (contoh: `'../_lib/db.js'`) |

---

*Dokumen ini disusun dari ERD (notasi Chen) dan diagram tabel (notasi crow's foot) sistem informasi penjualan dan pembelian buku, lalu disesuaikan untuk stack GitHub, React, Vercel, dan Neon.*
