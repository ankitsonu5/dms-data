import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentStatusResult } from '../payments/payment.service';

/**
 * Landing page for the Hosted Checkout return trip. The server has already
 * verified the signature and confirmed the status via the Fetch Payment
 * Details API before redirecting here — this page only reports the outcome.
 */
@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-status.html',
})
export class PaymentStatusComponent implements OnInit {
  result: PaymentStatusResult = { status: '' };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    this.result = {
      status: q.get('status') || 'failed',
      order_id: q.get('order_id') || '',
      payment_id: q.get('payment_id') || '',
      reason: q.get('reason') || '',
    };
  }

  get isPaid() {
    return this.result.status === 'paid';
  }

  get isCancelled() {
    return this.result.status === 'cancelled';
  }

  get heading() {
    if (this.isPaid) return 'Payment successful';
    if (this.isCancelled) return 'Payment cancelled';
    if (this.result.status === 'attempted') return 'Payment pending';
    return 'Payment failed';
  }

  get message() {
    if (this.isPaid) return 'Your payment has been received and recorded.';
    if (this.isCancelled)
      return 'You cancelled the payment. No amount was charged.';
    return this.result.reason || 'The payment could not be completed.';
  }

  back() {
    this.router.navigate(['/user-dashboard']);
  }
}
