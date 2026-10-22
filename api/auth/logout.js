import { clearSessionCookie } from '../_lib/auth.js';
import { allow } from '../_lib/http.js';

export default function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
