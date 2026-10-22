import { SignJWT, jwtVerify } from 'jose';

const MAX_AGE = 60 * 60 * 8; // 8 jam

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET belum diset');
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
}

export async function getSession(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type === 'pelanggan') {
      return {
        id_pelanggan: Number(payload.sub),
        nama: payload.nama,
        role: 'pelanggan',
        type: 'pelanggan',
      };
    }
    return {
      id_admin: Number(payload.sub),
      nama: payload.nama,
      role: payload.role,
      type: 'admin',
    };
  } catch {
    return null;
  }
}

// Mengembalikan sesi, atau mengirim 401/403 dan mengembalikan null.
export async function requireAuth(req, res, roles = null) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Belum login' });
    return null;
  }
  if (roles && !roles.includes(session.role)) {
    res.status(403).json({ error: 'Tidak punya akses' });
    return null;
  }
  return session;
}
