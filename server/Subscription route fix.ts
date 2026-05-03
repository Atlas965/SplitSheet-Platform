app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: { message: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment." } });
    }

    const userId = req.user.claims.sub;
    const user   = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: { message: "User not found" } });
    if (!user.email) return res.status(400).json({ error: { message: "No email address on file" } });

    const { plan = 'pro' } = req.body;
    if (!['pro', 'label'].includes(plan)) {
      return res.status(400).json({ error: { message: `Invalid plan: ${plan}` } });
    }

    // Resolve or reuse existing Stripe customer
    let customerId = user.stripeCustomerId as string | undefined;

    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as any).deleted) customerId = undefined;
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        metadata: { splitsheet_user_id: userId },
      });
      customerId = customer.id;
      await storage.updateUserStripeInfo(userId, customerId, user.stripeSubscriptionId ?? '');
    }

    // Check for existing active subscription on this plan
    if (user.stripeSubscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
          { expand: ['latest_invoice.payment_intent'] }
        );
        const isActive    = ['active', 'trialing'].includes(existingSub.status);
        const currentTier = (existingSub.metadata?.tier ?? 'pro') as string;

        if (isActive && currentTier === plan) {
          return res.json({ alreadyActive: true, plan, subscriptionId: existingSub.id });
        }
        if (isActive && currentTier !== plan) {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        }
        if (!isActive && existingSub.status === 'incomplete') {
          const secret = (existingSub.latest_invoice as any)?.payment_intent?.client_secret;
          if (secret) return res.json({ subscriptionId: existingSub.id, clientSecret: secret, plan });
        }
      } catch (err: any) {
        console.warn('[SUBSCRIPTION] Could not retrieve existing sub:', err.message);
      }
    }

    // Resolve price ID — create inline price if env var not set (demo mode)
    const priceEnvMap: Record<string, string | undefined> = {
      pro:   process.env.STRIPE_PRO_PRICE_ID,
      label: process.env.STRIPE_LABEL_PRICE_ID,
    };
    const amountMap: Record<string, number> = { pro: 1900, label: 4900 };

    let priceId: string;
    if (priceEnvMap[plan]) {
      priceId = priceEnvMap[plan] as string;
    } else {
      const inlinePrice = await stripe.prices.create({
        unit_amount:  amountMap[plan],
        currency:     'cad',
        recurring:    { interval: 'month' },
        product_data: { name: `SplitSheet ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` },
      });
      priceId = inlinePrice.id;
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer:         customerId,
      items:            [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand:           ['latest_invoice.payment_intent'],
      metadata:         { tier: plan, userId },
    });

    await storage.updateUserStripeInfo(userId, customerId, subscription.id);

    const clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret ?? null;
    if (!clientSecret) {
      return res.json({ subscriptionId: subscription.id, alreadyActive: true, plan });
    }

    return res.json({ subscriptionId: subscription.id, clientSecret, plan });

  } catch (error: any) {
    console.error('[SUBSCRIPTION ERROR]', error?.message ?? error);
    return res.status(400).json({ error: { message: error?.message ?? 'Subscription failed' } });
  }
});