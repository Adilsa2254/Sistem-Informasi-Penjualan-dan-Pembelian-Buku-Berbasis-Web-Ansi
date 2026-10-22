export function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Method tidak diizinkan' });
  return false;
}

export function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function fail(res, err) {
  // P0001 = RAISE EXCEPTION dari trigger/fungsi (aturan bisnis, mis. stok kurang)
  if (err?.code === 'P0001') return res.status(409).json({ error: err.message });
  if (err?.code === '23505') return res.status(409).json({ error: 'Data duplikat' });
  if (err?.code === '23503') return res.status(409).json({ error: 'Data masih dipakai data lain' });
  if (err?.code === '23514') return res.status(400).json({ error: 'Nilai tidak memenuhi aturan data' });
  console.error(err);
  return res.status(500).json({ error: 'Terjadi kesalahan server' });
}
