import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import Login from './pages/Login';
import Kasir from './pages/Kasir';
import Pelanggan from './pages/Pelanggan';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = memeriksa, null = belum login

  useEffect(() => {
    api.get('/auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  if (user === undefined) return <p>Memuat...</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
        <Route
          path="/"
          element={
            user
              ? user.role === 'pelanggan'
                ? <Pelanggan user={user} onLogout={logout} />
                : <AdminDashboard user={user} onLogout={logout} />
              : <Navigate to="/login" />
          }
        />
        <Route path="/kasir" element={user && user.role !== 'pelanggan' ? <Kasir user={user} onLogout={logout} /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
