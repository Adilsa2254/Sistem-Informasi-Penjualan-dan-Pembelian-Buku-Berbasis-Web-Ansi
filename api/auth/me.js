import { requireAuth } from '../_lib/auth.js';
import { allow } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  const session = await requireAuth(req, res);
  if (!session) return;
  res.status(200).json(session);
}
