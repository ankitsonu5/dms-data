'use strict';

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const { auth } = require('../middleware/auth');

const router = express.Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /payments/create-order
// Creates a Razorpay order and stores it in the database
router.post('/create-order', auth, async (req, res) => {
  try {
    const {
      amount,
      currency = 'INR',
      description = '',
      customerName = '',
      customerEmail = '',
      customerContact = '',
    } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res
        .status(400)
        .json({ error: 'Valid amount (in paise) is required' });
    }

    const razorpay = getRazorpay();
    const receipt = `rcpt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount)),
      currency,
      receipt,
      payment_capture: 1,
    });

    const payment = await Payment.create({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
      receipt,
      description,
      customerName,
      customerEmail,
      customerContact,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      description,
      customerName,
      customerEmail,
      customerContact,
    });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// POST /payments/verify
// Verifies the Razorpay signature after checkout completes
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment response fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid',
      },
      { new: true }
    );

    res.json({ ok: true, payment });
  } catch (err) {
    console.error('verify error', err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// GET /payments
// Lists all payments (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.setHeader('X-Total-Count', total);
    res.json(items);
  } catch (err) {
    console.error('list payments error', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /payments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

module.exports = router;
