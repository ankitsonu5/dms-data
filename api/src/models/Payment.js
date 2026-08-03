'use strict';

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    description: { type: String, trim: true },
    customerName: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    customerContact: { type: String, trim: true },
    status: {
      type: String,
      enum: ['created', 'attempted', 'paid', 'failed'],
      default: 'created',
    },
    receipt: { type: String, trim: true },
    // Snapshot of the Fetch Payment Details API response (GET /v1/payments/:id).
    // Razorpay's status is authoritative over the callback payload.
    gatewayStatus: { type: String, default: null },
    gatewayMethod: { type: String, default: null },
    gatewayDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    gatewayFetchedAt: { type: Date, default: null },
    errorCode: { type: String, default: null },
    errorDescription: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
