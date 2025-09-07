import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const DAYS_14 = 14 * 24 * 60 * 60; // seconds

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not verified' });
    }

    const email = session.customer_details?.email || session.customer_email || 'anon@numerawealth';

    // Sign a 14-day access token (no DB required)
    const exp = Math.floor(Date.now() / 1000) + DAYS_14;
    const token = jwt.sign(
      { sub: email, sid: session.id, scope: 'access', plan: '14days' },
      process.env.ACCESS_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: DAYS_14 }
    );

    return res.status(200).json({ token, expiresAt: exp * 1000, email });
  } catch (err) {
    console.error('verify-session error', err);
    return res.status(500).json({ error: 'Unable to verify session' });
  }
}
