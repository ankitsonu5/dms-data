'use strict';

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const { auth } = require('../middleware/auth');
const { anyAuth, userAuth } = require('../middleware/anyAuth');

const router = express.Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

const CHECKOUT_URL = 'https://api.razorpay.com/v1/checkout/embedded';

function trimSlash(url) {
  return String(url || '').replace(/\/$/, '');
}

// Hosted Checkout redirects the browser back to these absolute URLs, so they
// must be the public origins — not localhost — in any deployed environment.
function getCheckoutConfig() {
  const apiBase = trimSlash(process.env.API_PUBLIC_URL || process.env.WEB_URL);
  if (!apiBase) {
    throw new Error(
      'WEB_URL or API_PUBLIC_URL must be set for Hosted Checkout callbacks'
    );
  }
  return {
    merchantName:
      process.env.RAZORPAY_MERCHANT_NAME || 'U P Awas Evam Vikas Parishad',
    callbackUrl: `${apiBase}/payments/callback`,
    cancelUrl: `${apiBase}/payments/cancel`,
  };
}

function webRedirect(res, params) {
  const base = trimSlash(process.env.WEB_URL) || '';
  const query = new URLSearchParams(params).toString();
  return res.redirect(302, `${base}/payment-status?${query}`);
}

function verifySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Step 1.5 / Step 2 of the audit: the Fetch Payment Details API is the
// authoritative source of payment status. The full request and response are
// logged so they can be attached to the Security Audit document.
async function fetchPaymentDetails(paymentId) {
  const request = {
    method: 'GET',
    url: `https://api.razorpay.com/v1/payments/${paymentId}`,
    auth: `${process.env.RAZORPAY_KEY_ID}:<key_secret>`,
  };
  console.log(
    '[razorpay] fetch-payment-details request',
    JSON.stringify(request)
  );
  const response = await getRazorpay().payments.fetch(paymentId);
  console.log(
    '[razorpay] fetch-payment-details response',
    JSON.stringify(response)
  );
  return { request, response };
}

// POST /payments/create-order
// Creates a Razorpay order and stores it in the database
router.post('/create-order', anyAuth, async (req, res) => {
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

    const checkout = getCheckoutConfig();
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
      checkoutUrl: CHECKOUT_URL,
      merchantName: checkout.merchantName,
      callbackUrl: checkout.callbackUrl,
      cancelUrl: checkout.cancelUrl,
    });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// GET /payments/my — user's own payments
router.get('/my', userAuth, async (req, res) => {
  try {
    const items = await Payment.find({ customerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /payments/callback — the Hosted Checkout callback_url.
// Razorpay submits this as a top-level browser navigation, so it is
// unauthenticated (no JWT reaches it) and must respond with a redirect.
router.post('/callback', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } =
    req.body || {};

  try {
    console.log('[razorpay] callback payload', JSON.stringify(req.body || {}));

    // A failed payment posts here too, with error fields instead of the triplet.
    if (error) {
      const orderId = error?.metadata?.order_id || razorpay_order_id || '';
      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        {
          status: 'failed',
          razorpayPaymentId: error?.metadata?.payment_id || null,
          errorCode: error?.code || null,
          errorDescription: error?.description || null,
        }
      );
      return webRedirect(res, {
        status: 'failed',
        order_id: orderId,
        reason: error?.description || 'Payment failed',
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return webRedirect(res, {
        status: 'failed',
        reason: 'Incomplete payment response',
      });
    }

    if (
      !verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      )
    ) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', errorDescription: 'Signature verification failed' }
      );
      return webRedirect(res, {
        status: 'failed',
        order_id: razorpay_order_id,
        reason: 'Signature verification failed',
      });
    }

    const { response: details } = await fetchPaymentDetails(
      razorpay_payment_id
    );

    // Trust Razorpay's own record over the posted form fields: confirm the
    // payment belongs to this order, is for the expected amount, and is captured.
    const record = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    const mismatch =
      details.order_id !== razorpay_order_id ||
      (record && Number(details.amount) !== Number(record.amount));
    const captured = details.status === 'captured';

    const update = {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      gatewayStatus: details.status,
      gatewayMethod: details.method || null,
      gatewayDetails: details,
      gatewayFetchedAt: new Date(),
      errorCode: details.error_code || null,
      errorDescription: details.error_description || null,
    };

    if (mismatch || !captured) {
      update.status = captured ? 'attempted' : 'failed';
      if (mismatch) {
        update.status = 'failed';
        update.errorDescription = 'Order/amount mismatch on fetched payment';
      }
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        update
      );
      return webRedirect(res, {
        status: update.status,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        reason: update.errorDescription || `Payment status: ${details.status}`,
      });
    }

    update.status = 'paid';
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      update
    );

    return webRedirect(res, {
      status: 'paid',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (err) {
    console.error('callback error', err);
    return webRedirect(res, {
      status: 'failed',
      order_id: razorpay_order_id || '',
      reason: 'Could not confirm payment. Please check your payment history.',
    });
  }
});

// GET /payments/cancel — the Hosted Checkout cancel_url (customer went back).
// Must be declared before GET /:id so it is not swallowed by that route.
router.get('/cancel', async (req, res) => {
  const orderId = req.query.order_id || '';
  try {
    if (orderId) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId, status: 'created' },
        { status: 'attempted', errorDescription: 'Cancelled by customer' }
      );
    }
  } catch (err) {
    console.error('cancel error', err);
  }
  return webRedirect(res, { status: 'cancelled', order_id: orderId });
});

// GET /payments/:id/gateway-details — re-runs the Fetch Payment Details API and
// returns the raw request/response, for reconciliation and audit evidence.
router.get('/:id/gateway-details', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ error: 'Not found' });
    if (!payment.razorpayPaymentId) {
      return res
        .status(400)
        .json({ error: 'No payment id recorded for this order' });
    }

    const { request, response } = await fetchPaymentDetails(
      payment.razorpayPaymentId
    );

    await Payment.findByIdAndUpdate(payment._id, {
      gatewayStatus: response.status,
      gatewayMethod: response.method || null,
      gatewayDetails: response,
      gatewayFetchedAt: new Date(),
      status: response.status === 'captured' ? 'paid' : payment.status,
    });

    res.json({
      orderId: payment.razorpayOrderId,
      paymentId: payment.razorpayPaymentId,
      request,
      response,
    });
  } catch (err) {
    console.error('gateway-details error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch details' });
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
