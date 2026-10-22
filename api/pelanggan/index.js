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
