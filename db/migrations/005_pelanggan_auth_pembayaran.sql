ALTER TABLE pelanggan
    ADD COLUMN IF NOT EXISTS username VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pelanggan_username
    ON pelanggan(username)
    WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS pembayaran (
    id_pembayaran      SERIAL PRIMARY KEY,
    id_pembelian       INT NOT NULL UNIQUE REFERENCES pembelian(id_pembelian) ON DELETE CASCADE,
    metode             VARCHAR(20) NOT NULL DEFAULT 'qr',
    provider           VARCHAR(30) NOT NULL DEFAULT 'prototype',
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    payment_reference  VARCHAR(100) NOT NULL UNIQUE,
    qr_payload         TEXT NOT NULL,
    bukti_pembayaran   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at        TIMESTAMPTZ,
    reviewed_by        INT REFERENCES admin(id_admin) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pembayaran_status
    ON pembayaran(status, created_at DESC);
