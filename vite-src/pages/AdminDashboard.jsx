import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminDashboard({ user, onLogout }) {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  async function muat() {
    setPayments(await api.get('/pembayaran'));
  }
  useEffect(() => { muat().catch((e) => setError(e.message)); }, []);

  async function review(id_pembayaran, status) {
    try {
      await api.patch('/pembayaran', { id_pembayaran, status });
      await muat();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Dashboard Admin</h1>
        <span>{user.nama} ({user.role}) <button onClick={onLogout}>Keluar</button></span>
      </header>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <h2>Pembayaran menunggu persetujuan</h2>
      {!payments.length && <p>Tidak ada pembayaran pending.</p>}
      {payments.map((payment) => (
        <article key={payment.id_pembayaran} style={{ border: '1px solid #ddd', padding: 16, marginBottom: 12 }}>
          <strong>{payment.no_transaksi}</strong>
          <p>Pelanggan: {payment.pelanggan || 'Pembeli umum'}</p>
          <p>Referensi: {payment.payment_reference}</p>
          <p>Bukti: {payment.bukti_pembayaran}</p>
          <button onClick={() => review(payment.id_pembayaran, 'approved')}>ACC pembayaran</button>
          <button onClick={() => review(payment.id_pembayaran, 'rejected')}>Tolak</button>
        </article>
      ))}
    </main>
  );
}
