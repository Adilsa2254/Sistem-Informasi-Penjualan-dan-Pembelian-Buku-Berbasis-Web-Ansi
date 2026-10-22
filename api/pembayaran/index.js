import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { allow, fail, toInt } from '../_lib/http.js';
import { createPaymentIntent } from '../_lib/payment.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET', 'POST', 'PATCH'])) return;

  const roles = req.method === 'POST' ? ['pelanggan'] : ['admin'];
  const session = await requireAuth(req, res, roles);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT pm.id_pembayaran, pm.id_pembelian, pb.no_transaksi, pb.total,
               pl.nama AS pelanggan, pm.metode, pm.provider, pm.status,
               pm.payment_reference, pm.qr_payload, pm.bukti_pembayaran,
               pm.created_at
          FROM pembayaran pm
          JOIN pembelian pb ON pb.id_pembelian = pm.id_pembelian
          LEFT JOIN pelanggan pl ON pl.id_pelanggan = pb.id_pelanggan
         WHERE pm.status = 'pending'
         ORDER BY pm.created_at ASC
         LIMIT 100`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const idPembelian = toInt(req.body?.id_pembelian);
      const bukti = typeof req.body?.bukti_pembayaran === 'string'
        ? req.body.bukti_pembayaran.trim()
        : '';
      if (idPembelian === null || !bukti) {
        return res.status(400).json({
          error: 'id_pembelian dan bukti_pembayaran wajib diisi',
        });
      }

      const purchases = await sql`
        SELECT id_pembelian, no_transaksi, total
          FROM pembelian
         WHERE id_pembelian = ${idPembelian}
           AND id_pelanggan = ${session.id_pelanggan}`;
      const purchase = purchases[0];
      if (!purchase) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

      const existing = await sql`
        SELECT id_pembayaran, status, payment_reference, qr_payload
          FROM pembayaran WHERE id_pembelian = ${idPembelian}`;
      if (existing[0]?.status === 'approved') {
        return res.status(409).json({ error: 'Pembayaran sudah disetujui' });
      }
      if (existing[0]) {
        const rows = await sql`
          UPDATE pembayaran
             SET bukti_pembayaran = ${bukti}, status = 'pending',
                 reviewed_at = NULL, reviewed_by = NULL
           WHERE id_pembayaran = ${existing[0].id_pembayaran}
           RETURNING *`;
        return res.status(200).json(rows[0]);
      }

      const intent = createPaymentIntent({
        noTransaksi: purchase.no_transaksi,
        total: purchase.total,
      });
      const rows = await sql`
        INSERT INTO pembayaran (
          id_pembelian, metode, provider, status, payment_reference,
          qr_payload, bukti_pembayaran
        )
        VALUES (${idPembelian}, ${intent.metode}, ${intent.provider}, 'pending',
                ${intent.reference}, ${intent.qrPayload}, ${bukti})
        RETURNING *`;
      return res.status(201).json(rows[0]);
    }

    const idPembayaran = toInt(req.body?.id_pembayaran);
    const status = req.body?.status;
    if (idPembayaran === null || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'id_pembayaran valid dan status approved atau rejected wajib diisi',
      });
    }

    const rows = await sql`
      UPDATE pembayaran
         SET status = ${status}, reviewed_at = now(), reviewed_by = ${session.id_admin}
       WHERE id_pembayaran = ${idPembayaran}
         AND status = 'pending'
       RETURNING id_pembayaran, id_pembelian, status, reviewed_at, reviewed_by`;
    if (!rows[0]) return res.status(404).json({ error: 'Pembayaran pending tidak ditemukan' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    return fail(res, err);
  }
}
