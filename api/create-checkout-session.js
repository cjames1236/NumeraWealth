import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Robust origin fallback
    const origin =
      req.headers.origin ||
      (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://${req.headers.host}`);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      // If Cash App Pay is enabled in your Stripe account’s Wallets, it appears automatically.
      // payment_method_types: ['card', 'cashapp'] // (optional; only if both are enabled on your account)
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    // Make diagnosis easy without leaking secrets
    const msg = err?.raw?.message || err?.message || 'Unable to create checkout session';
    console.error('create-checkout-session error:', msg);
    // If price missing / wrong mode / bad key, Stripe sets raw.message clearly.
    return res.status(500).json({ error: msg });
  }
}
