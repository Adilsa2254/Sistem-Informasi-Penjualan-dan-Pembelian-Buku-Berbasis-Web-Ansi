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
