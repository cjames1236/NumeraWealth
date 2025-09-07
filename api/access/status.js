import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ active: false });

  try {
    const payload = jwt.verify(token, process.env.ACCESS_JWT_SECRET, { algorithms: ['HS256'] });
    const nowMs = Date.now();
    const expMs = (payload.exp || 0) * 1000;
    const msLeft = expMs - nowMs;
    const daysLeft = msLeft > 0 ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : 0;

    return res.status(200).json({ active: msLeft > 0, daysLeft, email: payload.sub });
  } catch {
    return res.status(401).json({ active: false });
  }
}
