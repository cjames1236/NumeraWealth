import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const key   = process.env.STRIPE_SECRET_KEY;
    const price = process.env.STRIPE_PRICE_ID;

    if (!key)   return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY (set in Vercel envs)' });
    if (!price) return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID (create a one-time $0.99 price and use its Price ID)' });

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    const origin =
      req.headers.origin ||
      (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://${req.headers.host}`);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const msg = err?.raw?.message || err?.message || 'Unable to create checkout session';
    console.error('create-checkout-session error:', msg);
    return res.status(500).json({ error: msg });
  }
}
