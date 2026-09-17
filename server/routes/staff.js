const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const requirePinReset = require('../middleware/requirePinReset');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const prisma = new PrismaClient();

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function signToken(staff) {
  return jwt.sign(
    { staff_id: staff.staff_id, role: staff.role, requires_pin_reset: staff.requires_pin_reset },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '8h' }
  );
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { staff_id, pin } = req.body;
    if (!staff_id || !pin) {
      return res.status(400).json({ error: 'staff_id and pin are required' });
    }

    const staff = await prisma.staff.findUnique({ where: { staff_id: Number(staff_id) } });
    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(String(pin), staff.pin);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(staff);
    res.json({
      token,
      staff: {
        staff_id: staff.staff_id,
        name: staff.name,
        role: staff.role,
        requires_pin_reset: staff.requires_pin_reset,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/set-pin', authenticate, async (req, res) => {
  try {
    const { new_pin, confirm_pin } = req.body;
    if (!new_pin || !confirm_pin) {
      return res.status(400).json({ error: 'new_pin and confirm_pin are required' });
    }
    if (new_pin !== confirm_pin) {
      return res.status(400).json({ error: 'PINs do not match' });
    }
    if (!/^\d{4,8}$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits' });
    }

    const hashed = await bcrypt.hash(String(new_pin), 10);
    const staff = await prisma.staff.update({
      where: { staff_id: req.staff.staff_id },
      data: { pin: hashed, requires_pin_reset: false },
    });

    const token = signToken(staff);
    res.json({
      message: 'PIN updated successfully',
      token,
      staff: {
        staff_id: staff.staff_id,
        name: staff.name,
        role: staff.role,
        requires_pin_reset: staff.requires_pin_reset,
      },
    });
  } catch (err) {
    console.error('Set PIN error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, requireAdmin, requirePinReset, async (_req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      select: { staff_id: true, name: true, role: true, requires_pin_reset: true },
      orderBy: { staff_id: 'asc' },
    });
    res.json(staff);
  } catch (err) {
    console.error('List staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireAdmin, requirePinReset, async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }
    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin or cashier' });
    }

    const tempPin = generatePin();
    const hashed = await bcrypt.hash(tempPin, 10);

    const staff = await prisma.staff.create({
      data: { name, role, pin: hashed, requires_pin_reset: true },
    });

    res.status(201).json({
      staff: {
        staff_id: staff.staff_id,
        name: staff.name,
        role: staff.role,
        requires_pin_reset: staff.requires_pin_reset,
      },
      temporary_pin: tempPin,
      message: 'Save this PIN — it will not be shown again.',
    });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/reset-pin', authenticate, requireAdmin, requirePinReset, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.staff.findUnique({ where: { staff_id: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const tempPin = generatePin();
    const hashed = await bcrypt.hash(tempPin, 10);

    await prisma.staff.update({
      where: { staff_id: id },
      data: { pin: hashed, requires_pin_reset: true },
    });

    res.json({
      staff_id: id,
      temporary_pin: tempPin,
      message: 'Save this PIN — it will not be shown again.',
    });
  } catch (err) {
    console.error('Reset PIN error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, requirePinReset, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.staff.findUnique({ where: { staff_id: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    await prisma.staff.delete({ where: { staff_id: id } });
    res.json({ message: 'Staff member deleted' });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
