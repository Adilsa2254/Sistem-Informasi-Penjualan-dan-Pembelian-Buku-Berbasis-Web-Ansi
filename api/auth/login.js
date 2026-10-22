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
    const adminRows = await sql`
      SELECT id_admin, nama, username, password_hash, role
        FROM admin WHERE username = ${username}`;
    const admin = adminRows[0];
    if (admin && await bcrypt.compare(password, admin.password_hash)) {
      const token = await signToken({
        sub: String(admin.id_admin),
        nama: admin.nama,
        role: admin.role,
        type: 'admin',
      });
      setSessionCookie(res, token);
      return res.status(200).json({
        id_admin: admin.id_admin,
        nama: admin.nama,
        role: admin.role,
        type: 'admin',
      });
    }

    const pelangganRows = await sql`
      SELECT id_pelanggan, nama, username, password_hash
        FROM pelanggan WHERE username = ${username}`;
    const pelanggan = pelangganRows[0];
    if (!pelanggan?.password_hash || !(await bcrypt.compare(password, pelanggan.password_hash))) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = await signToken({
      sub: String(pelanggan.id_pelanggan),
      nama: pelanggan.nama,
      role: 'pelanggan',
      type: 'pelanggan',
    });
    setSessionCookie(res, token);
    return res.status(200).json({
      id_pelanggan: pelanggan.id_pelanggan,
      nama: pelanggan.nama,
      role: 'pelanggan',
      type: 'pelanggan',
    });
  } catch (err) {
    return fail(res, err);
  }
}
