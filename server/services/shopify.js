const https = require('https');
const url = require('url');

function getConfig() {
  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!storeUrl || !accessToken) return null;
  return { storeUrl: storeUrl.replace(/\/$/, ''), accessToken, apiSecret };
}

function shopifyRequest(method, path, body) {
  const config = getConfig();
  if (!config) return Promise.resolve(null);

  const parsed = new url.URL(`${config.storeUrl}${path}`);
  const postData = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': config.accessToken,
      },
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function createShopifyListing(unit) {
  try {
    const config = getConfig();
    if (!config) {
      console.log('Shopify credentials not configured — skipping product sync');
      return null;
    }

    const specs = typeof unit.specs === 'string' ? JSON.parse(unit.specs) : unit.specs;
    const description = [
      `<p>Grade: ${unit.grade}</p>`,
      `<p>CPU: ${specs.cpu || 'N/A'}</p>`,
      `<p>RAM: ${specs.ram || 'N/A'}</p>`,
      `<p>Storage: ${specs.storage || 'N/A'}</p>`,
      unit.condition_notes ? `<p>Condition: ${unit.condition_notes}</p>` : '',
    ].join('');

    const result = await shopifyRequest('POST', '/admin/api/2024-01/products.json', {
      product: {
        title: `${unit.brand} ${unit.model}`,
        body_html: description,
        variants: [{ price: String(unit.price), inventory_quantity: 1 }],
      },
    });

    if (result && result.product) {
      return {
        shopify_product_id: String(result.product.id),
        shopify_variant_id: String(result.product.variants[0].id),
      };
    }
    return null;
  } catch (err) {
    console.error('Shopify createShopifyListing error:', err.message);
    return null;
  }
}

async function archiveShopifyListing(unit) {
  try {
    const config = getConfig();
    if (!config || !unit.shopify_product_id) return;

    if (unit.shopify_variant_id) {
      const inventoryResult = await shopifyRequest(
        'GET',
        `/admin/api/2024-01/variants/${unit.shopify_variant_id}.json`
      );
      if (inventoryResult && inventoryResult.variant) {
        const inventoryItemId = inventoryResult.variant.inventory_item_id;
        const locationsResult = await shopifyRequest(
          'GET',
          '/admin/api/2024-01/locations.json'
        );
        if (locationsResult && locationsResult.locations && locationsResult.locations[0]) {
          await shopifyRequest('POST', '/admin/api/2024-01/inventory_levels/set.json', {
            location_id: locationsResult.locations[0].id,
            inventory_item_id: inventoryItemId,
            available: 0,
          });
        }
      }
    }

    await shopifyRequest('PUT', `/admin/api/2024-01/products/${unit.shopify_product_id}.json`, {
      product: { id: Number(unit.shopify_product_id), published: false },
    });
  } catch (err) {
    console.error('Shopify archiveShopifyListing error:', err.message);
  }
}

async function handleShopifyOrderWebhook(body) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const order = typeof body === 'string' ? JSON.parse(body) : body;
    const lineItems = order.line_items || [];

    for (const item of lineItems) {
      const variantId = String(item.variant_id);
      const unit = await prisma.unit.findFirst({
        where: { shopify_variant_id: variantId },
      });

      if (unit && unit.status === 'available') {
        await prisma.unit.update({
          where: { unit_id: unit.unit_id },
          data: { status: 'sold' },
        });

        await prisma.transaction.create({
          data: {
            unit_id: unit.unit_id,
            type: 'sale',
            price_at_sale: unit.price,
            staff_id: unit.staff_id,
            notes: `Shopify order ${order.id || 'unknown'}`,
          },
        });
      }
    }
  } catch (err) {
    console.error('Shopify handleShopifyOrderWebhook error:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

function verifyShopifyWebhook(rawBody, hmacHeader) {
  const crypto = require('crypto');
  const config = getConfig();
  if (!config || !config.apiSecret) return false;

  const digest = crypto
    .createHmac('sha256', config.apiSecret)
    .update(rawBody)
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

module.exports = {
  createShopifyListing,
  archiveShopifyListing,
  handleShopifyOrderWebhook,
  verifyShopifyWebhook,
};
