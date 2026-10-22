import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { allow, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;

  const { nama, username, password, email, no_hp } = req.body ?? {};
  if (
    typeof nama !== 'string' || !nama.trim() ||
    typeof username !== 'string' || !username.trim() ||
    typeof password !== 'string' || password.length < 8
  ) {
    return res.status(400).json({
      error: 'Nama dan username wajib diisi, password minimal 8 karakter',
    });
  }

  try {
    const existing = await sql`
      SELECT username FROM admin WHERE username = ${username.trim()}
      UNION ALL
      SELECT username FROM pelanggan WHERE username = ${username.trim()}`;
    if (existing.length) return res.status(409).json({ error: 'Username sudah dipakai' });

    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO pelanggan (nama, username, password_hash, email, no_hp)
      VALUES (${nama.trim()}, ${username.trim()}, ${hash}, ${email || null}, ${no_hp || null})
      RETURNING id_pelanggan, nama, username`;
    return res.status(201).json({ ...rows[0], role: 'pelanggan', type: 'pelanggan' });
  } catch (err) {
    return fail(res, err);
  }
}
