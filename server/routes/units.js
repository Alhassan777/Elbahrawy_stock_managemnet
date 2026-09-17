const express = require('express');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const requirePinReset = require('../middleware/requirePinReset');
const { syncCreateWithQueue, syncArchiveWithQueue } = require('../services/shopify');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePinReset, async (req, res) => {
  try {
    const { status, grade, brand, sort = 'received_at', order = 'desc', page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status && ['available', 'sold'].includes(status)) where.status = status;
    if (grade && ['A', 'B', 'C'].includes(grade)) where.grade = grade;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    const orderField = ['price', 'received_at'].includes(sort) ? sort : 'received_at';
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take: limitNum,
        include: { staff: { select: { name: true } } },
      }),
      prisma.unit.count({ where }),
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
    console.error('List units error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, requirePinReset, async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { unit_id: Number(req.params.id) },
      include: { staff: { select: { name: true } } },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    console.error('Get unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/qr', authenticate, requirePinReset, async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({ where: { unit_id: Number(req.params.id) } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    res.setHeader('Content-Type', 'image/png');
    const stream = QRCode.toFileStream(res, unit.qr_code, { type: 'png', width: 300 });
  } catch (err) {
    console.error('QR code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/transactions', authenticate, requirePinReset, async (req, res) => {
  try {
    const unitId = Number(req.params.id);
    const unit = await prisma.unit.findUnique({ where: { unit_id: unitId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const transactions = await prisma.transaction.findMany({
      where: { unit_id: unitId },
      orderBy: { timestamp: 'desc' },
      include: { staff: { select: { name: true } } },
    });
    res.json(transactions);
  } catch (err) {
    console.error('Unit transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireAdmin, requirePinReset, async (req, res) => {
  try {
    const { brand, model, specs, grade, condition_notes, price, supplier } = req.body;

    if (!brand || !model || !specs || !grade || price === undefined) {
      return res.status(400).json({ error: 'brand, model, specs, grade, and price are required' });
    }
    if (!['A', 'B', 'C'].includes(grade)) {
      return res.status(400).json({ error: 'grade must be A, B, or C' });
    }

    const lastUnit = await prisma.unit.findFirst({ orderBy: { unit_id: 'desc' } });
    const nextId = (lastUnit ? lastUnit.unit_id : 0) + 1;
    const qr_code = `UNIT-${String(nextId).padStart(5, '0')}`;

    const unit = await prisma.unit.create({
      data: {
        qr_code,
        brand,
        model,
        specs,
        grade,
        condition_notes: condition_notes || null,
        price,
        supplier: supplier || null,
        staff_id: req.staff.staff_id,
      },
    });

    await prisma.transaction.create({
      data: {
        unit_id: unit.unit_id,
        type: 'receipt',
        price_at_sale: unit.price,
        staff_id: req.staff.staff_id,
        notes: 'Unit received into inventory',
      },
    });

    const shopifyIds = await syncCreateWithQueue(unit);
    if (shopifyIds) {
      unit.shopify_product_id = shopifyIds.shopify_product_id;
      unit.shopify_variant_id = shopifyIds.shopify_variant_id;
    }

    res.status(201).json(unit);
  } catch (err) {
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/sell', authenticate, requirePinReset, async (req, res) => {
  try {
    const unitId = Number(req.params.id);
    const unit = await prisma.unit.findUnique({ where: { unit_id: unitId } });

    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.status === 'sold') return res.status(400).json({ error: 'Unit is already sold' });

    const updatedUnit = await prisma.unit.update({
      where: { unit_id: unitId },
      data: { status: 'sold' },
    });

    await prisma.transaction.create({
      data: {
        unit_id: unitId,
        type: 'sale',
        price_at_sale: unit.price,
        staff_id: req.staff.staff_id,
        notes: req.body.notes || null,
      },
    });

    await syncArchiveWithQueue(updatedUnit);

    res.json(updatedUnit);
  } catch (err) {
    console.error('Sell unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
