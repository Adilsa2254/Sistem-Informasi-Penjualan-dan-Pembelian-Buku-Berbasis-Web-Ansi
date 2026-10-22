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
