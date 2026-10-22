import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const rupiah = (n) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(n);

export default function Pelanggan({ user, onLogout }) {
  const [transaksi, setTransaksi] = useState([]);
  const [bukti, setBukti] = useState({});
  const [pesan, setPesan] = useState(null);

  async function muat() {
    setTransaksi(await api.get('/pelanggan/transaksi'));
  }
  useEffect(() => { muat().catch((e) => setPesan({ error: e.message })); }, []);

  async function bayar(item) {
    try {
      const hasil = await api.post('/pembayaran', {
        id_pembelian: item.id_pembelian,
        bukti_pembayaran: bukti[item.id_pembelian],
      });
      setPesan({ ok: `Pembayaran ${hasil.payment_reference} menunggu persetujuan admin.` });
      await muat();
    } catch (e) {
      setPesan({ error: e.message });
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Akun Pelanggan</h1>
        <span>{user.nama} <button onClick={onLogout}>Keluar</button></span>
      </header>
      {pesan?.ok && <p style={{ color: 'green' }}>{pesan.ok}</p>}
      {pesan?.error && <p style={{ color: 'crimson' }}>{pesan.error}</p>}
      <h2>Transaksi saya</h2>
      {transaksi.map((item) => (
        <article key={item.id_pembelian} style={{ border: '1px solid #ddd', padding: 16, marginBottom: 12 }}>
          <strong>{item.no_transaksi}</strong>
          <p>Total: {rupiah(item.total)} · Status: {item.payment_status}</p>
          {item.payment_status === 'unpaid' && (
            <>
              <p>QR prototype: <code>{`QRIS-PROTOTYPE|${item.no_transaksi}|${item.total}`}</code></p>
              <input
                placeholder="Nomor referensi/bukti pembayaran"
                value={bukti[item.id_pembelian] || ''}
                onChange={(e) => setBukti((state) => ({ ...state, [item.id_pembelian]: e.target.value }))}
              />
              <button onClick={() => bayar(item)}>Kirim pembayaran</button>
            </>
          )}
        </article>
      ))}
    </main>
  );
}
