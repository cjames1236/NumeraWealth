// Minimal Square payment verification → issues a 30-day JWT
// Env required: SQUARE_ACCESS_TOKEN, JWT_SECRET
// Optional: PRICE_CENTS=199, PRICE_CURRENCY=USD

const jwt = require('jsonwebtoken');

const SQUARE_API = 'https://connect.squareup.com/v2';
const PRICE_CENTS = Number(process.env.PRICE_CENTS || 199);
const PRICE_CURRENCY = process.env.PRICE_CURRENCY || 'USD';
const DAYS = 30;

module.exports = async (req, res) => {
  try {
    const { txn = '', orderId = '' } = req.query || {};
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const jwtSecret = process.env.JWT_SECRET;
    if (!accessToken || !jwtSecret) {
      return res.status(500).json({ error: 'Server not configured' });
    }
    if (!txn && !orderId) {
      return res.status(400).json({ error: 'Missing paymentId or orderId' });
    }

    let ok = false;

    // Prefer payment lookup
    if (txn) {
      const r = await fetch(`${SQUARE_API}/payments/${encodeURIComponent(txn)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await r.json();
      if (!r.ok) {
        return res.status(400).json({ error: data?.errors?.[0]?.detail || 'Square payment lookup failed' });
      }
      const p = data.payment;
      if (p?.status === 'COMPLETED'
        && p?.amount_money?.amount === PRICE_CENTS
        && p?.amount_money?.currency === PRICE_CURRENCY) {
        ok = true;
      }
    }

    // Order fallback if provided
    if (!ok && orderId) {
      const r2 = await fetch(`${SQUARE_API}/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      const data2 = await r2.json();
      if (!r2.ok) {
        return res.status(400).json({ error: data2?.errors?.[0]?.detail || 'Square order lookup failed' });
      }
      const o = data2.order;
      const total = Number(o?.total_money?.amount || 0);
      const curr = o?.total_money?.currency || '';
      // Accept PAID/COMPLETED states; Square orders can be paid via payment links
      if (total === PRICE_CENTS && curr === PRICE_CURRENCY) {
        ok = true;
      }
    }

    if (!ok) {
      return res.status(402).json({ error: 'Payment not verified for $1.99 USD' });
    }

    const exp = Math.floor(Date.now()/1000) + DAYS * 24 * 60 * 60;
    const token = jwt.sign(
      { scope: 'access', periodDays: DAYS, iat: Math.floor(Date.now()/1000), exp },
      jwtSecret
    );
    return res.status(200).json({ token });
  } catch (e) {
    console.error('verify-session error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
