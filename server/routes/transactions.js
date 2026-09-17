const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const requirePinReset = require('../middleware/requirePinReset');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requireAdmin, requirePinReset, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
        include: {
          unit: { select: { qr_code: true, brand: true, model: true } },
          staff: { select: { name: true } },
        },
      }),
      prisma.transaction.count(),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
