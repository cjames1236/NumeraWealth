// Validates the JWT and returns remaining days
// Env: JWT_SECRET

const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  try {
    const hdr = req.headers['authorization'] || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) return res.status(401).json({ active:false, daysLeft:0 });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured' });

    const payload = jwt.verify(token, secret);
    const now = Math.floor(Date.now()/1000);
    const secsLeft = Math.max(0, (payload.exp || 0) - now);
    const daysLeft = Math.max(1, Math.ceil(secsLeft / 86400));
    return res.status(200).json({ active:true, daysLeft });
  } catch {
    return res.status(401).json({ active:false, daysLeft:0 });
  }
};
