const express = require('express');
const { verifyShopifyWebhook, handleShopifyOrderWebhook } = require('../services/shopify');

const router = express.Router();

router.post('/shopify/order-created', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    if (!hmac) {
      return res.status(401).json({ error: 'Missing HMAC header' });
    }

    const rawBody = req.body;
    if (!verifyShopifyWebhook(rawBody, hmac)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const body = JSON.parse(rawBody.toString());
    await handleShopifyOrderWebhook(body);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
