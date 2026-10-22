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
