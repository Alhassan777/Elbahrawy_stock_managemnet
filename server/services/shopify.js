const https = require('https');
const url = require('url');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MAX_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 60 * 1000;

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
}

async function archiveShopifyListing(unit) {
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
}

async function syncCreateWithQueue(unit) {
  try {
    const ids = await createShopifyListing(unit);
    if (ids) {
      await prisma.unit.update({
        where: { unit_id: unit.unit_id },
        data: ids,
      });
      return ids;
    }
    if (!getConfig()) return null;
    throw new Error('Shopify returned no product data');
  } catch (err) {
    console.error('Shopify sync failed, queuing for retry:', err.message);
    await prisma.shopifySyncQueue.create({
      data: { unit_id: unit.unit_id, action: 'create_listing', last_error: err.message },
    });
    return null;
  }
}

async function syncArchiveWithQueue(unit) {
  try {
    await archiveShopifyListing(unit);
  } catch (err) {
    console.error('Shopify archive failed, queuing for retry:', err.message);
    await prisma.shopifySyncQueue.create({
      data: { unit_id: unit.unit_id, action: 'archive_listing', last_error: err.message },
    });
  }
}

async function processQueue() {
  const pending = await prisma.shopifySyncQueue.findMany({
    where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
    include: { unit: true },
    orderBy: { created_at: 'asc' },
    take: 10,
  });

  for (const job of pending) {
    try {
      if (job.action === 'create_listing') {
        const ids = await createShopifyListing(job.unit);
        if (ids) {
          await prisma.unit.update({ where: { unit_id: job.unit_id }, data: ids });
          await prisma.shopifySyncQueue.update({
            where: { id: job.id },
            data: { status: 'done', attempts: job.attempts + 1 },
          });
          console.log(`Sync queue: created listing for unit ${job.unit_id}`);
          continue;
        }
      } else if (job.action === 'archive_listing') {
        await archiveShopifyListing(job.unit);
        await prisma.shopifySyncQueue.update({
          where: { id: job.id },
          data: { status: 'done', attempts: job.attempts + 1 },
        });
        console.log(`Sync queue: archived listing for unit ${job.unit_id}`);
        continue;
      }
      throw new Error('Sync returned no result');
    } catch (err) {
      const newAttempts = job.attempts + 1;
      await prisma.shopifySyncQueue.update({
        where: { id: job.id },
        data: {
          attempts: newAttempts,
          last_error: err.message,
          status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        },
      });
      console.error(`Sync queue: attempt ${newAttempts}/${MAX_ATTEMPTS} failed for unit ${job.unit_id}: ${err.message}`);
    }
  }
}

let retryTimer = null;

function startSyncWorker() {
  if (retryTimer) return;
  console.log(`Shopify sync worker started (retry every ${RETRY_INTERVAL_MS / 1000}s, max ${MAX_ATTEMPTS} attempts)`);
  retryTimer = setInterval(async () => {
    try {
      await processQueue();
    } catch (err) {
      console.error('Sync worker error:', err.message);
    }
  }, RETRY_INTERVAL_MS);
}

function stopSyncWorker() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

async function handleShopifyOrderWebhook(body) {
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
  syncCreateWithQueue,
  syncArchiveWithQueue,
  startSyncWorker,
  stopSyncWorker,
  handleShopifyOrderWebhook,
  verifyShopifyWebhook,
};
