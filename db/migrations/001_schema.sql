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
