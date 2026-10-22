import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Kasir({ user, onLogout }) {
  const [buku, setBuku] = useState([]);
  const [pelanggan, setPelanggan] = useState([]);
  const [idPelanggan, setIdPelanggan] = useState('');
  const [keranjang, setKeranjang] = useState({}); // { id_buku: quantity }
  const [pesan, setPesan] = useState(null);
  const [loading, setLoading] = useState(false);

  async function muat() {
    const [b, p] = await Promise.all([api.get('/buku'), api.get('/pelanggan')]);
    setBuku(b);
    setPelanggan(p);
  }
  useEffect(() => { muat().catch((e) => setPesan({ error: e.message })); }, []);

  const total = useMemo(
    () => buku.reduce((sum, b) => sum + (keranjang[b.id_buku] || 0) * Number(b.harga), 0),
    [buku, keranjang]
  );

  function ubah(idBuku, qty) {
    setKeranjang((k) => {
      const next = { ...k };
      if (qty > 0) next[idBuku] = qty; else delete next[idBuku];
      return next;
    });
  }

  async function bayar() {
    const items = Object.entries(keranjang).map(([id, quantity]) => ({ id_buku: Number(id), quantity }));
    if (!items.length) return setPesan({ error: 'Keranjang masih kosong' });
    setLoading(true);
    setPesan(null);
    try {
      const hasil = await api.post('/transaksi', {
        id_pelanggan: idPelanggan ? Number(idPelanggan) : null,
        items,
      });
      setPesan({ ok: `Nota ${hasil.no_transaksi} dibuat. Total ${rupiah(hasil.total)}` });
      setKeranjang({});
      await muat(); // stok terbaru
    } catch (e) {
      setPesan({ error: e.message }); // mis. "Stok buku id 4 tidak cukup ..."
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Kasir</h1>
        <span>{user.nama} ({user.role}) <button onClick={onLogout}>Keluar</button></span>
      </header>

      <label>
        Pelanggan:{' '}
        <select value={idPelanggan} onChange={(e) => setIdPelanggan(e.target.value)}>
          <option value="">Pembeli umum</option>
          {pelanggan.map((p) => <option key={p.id_pelanggan} value={p.id_pelanggan}>{p.nama}</option>)}
        </select>
      </label>

      <table style={{ width: '100%', marginTop: 16 }}>
        <thead><tr><th align="left">Judul</th><th>Harga</th><th>Stok</th><th>Qty</th></tr></thead>
        <tbody>
          {buku.map((b) => (
            <tr key={b.id_buku}>
              <td>{b.judul}</td>
              <td align="right">{rupiah(b.harga)}</td>
              <td align="center">{b.stok}</td>
              <td align="center">
                <input type="number" min="0" max={b.stok} style={{ width: 64 }}
                  value={keranjang[b.id_buku] || 0}
                  onChange={(e) => ubah(b.id_buku, Number(e.target.value))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Total: {rupiah(total)}</h2>
      <button onClick={bayar} disabled={loading}>{loading ? 'Memproses...' : 'Buat transaksi'}</button>
      {pesan?.ok && <p style={{ color: 'green' }}>{pesan.ok}</p>}
      {pesan?.error && <p style={{ color: 'crimson' }}>{pesan.error}</p>}
    </main>
  );
}
