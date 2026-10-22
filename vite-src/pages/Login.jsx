import { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { nama, username, password, email });
        setMode('login');
        setError('Akun pelanggan dibuat. Silakan login.');
      } else {
        onLogin(await api.post('/auth/login', { username, password }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '4rem auto', display: 'grid', gap: 12 }}>
      <h1>{mode === 'register' ? 'Daftar Pelanggan' : 'Login'}</h1>
      {mode === 'register' && (
        <>
          <input placeholder="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
          <input type="email" placeholder="Email (opsional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </>
      )}
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button disabled={loading}>{loading ? 'Memproses...' : mode === 'register' ? 'Daftar' : 'Masuk'}</button>
      <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        {mode === 'login' ? 'Daftar sebagai pelanggan' : 'Kembali ke login'}
      </button>
    </form>
  );
}
