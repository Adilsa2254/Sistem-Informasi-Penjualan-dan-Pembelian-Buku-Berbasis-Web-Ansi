import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  const session = await requireAuth(req, res, ['pelanggan']);
  if (!session) return;

  try {
    const rows = await sql`
      SELECT pb.id_pembelian, pb.no_transaksi, pb.tgl_pembelian, pb.total,
             COALESCE(pm.status, 'unpaid') AS payment_status,
             pm.id_pembayaran, pm.qr_payload, pm.payment_reference
        FROM pembelian pb
        LEFT JOIN pembayaran pm ON pm.id_pembelian = pb.id_pembelian
       WHERE pb.id_pelanggan = ${session.id_pelanggan}
       ORDER BY pb.id_pembelian DESC
       LIMIT 50`;
    return res.status(200).json(rows);
  } catch (err) {
    return fail(res, err);
  }
}
