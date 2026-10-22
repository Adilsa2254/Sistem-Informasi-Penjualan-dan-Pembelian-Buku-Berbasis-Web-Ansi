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
