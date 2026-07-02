import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRecord } from './payment.service';
import { SharedModule } from '../shared/shared.module';

declare const Razorpay: any;

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.scss'],
})
export class PaymentsComponent implements OnInit {
  payments: PaymentRecord[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;
  error = '';

  // New payment form
  showForm = false;
  form = {
    amountRs: '',
    description: '',
    customerName: '',
    customerEmail: '',
    customerContact: '',
  };
  formError = '';
  paying = false;
  successMsg = '';

  constructor(private svc: PaymentService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.svc.list({ page: this.page, limit: this.limit }).subscribe({
      next: ({ items, total }) => {
        this.payments = items;
        this.total = total;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to load payments';
        this.loading = false;
      },
    });
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get pageEnd() {
    return Math.min(this.page * this.limit, this.total);
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  openForm() {
    this.showForm = true;
    this.formError = '';
    this.successMsg = '';
    this.form = {
      amountRs: '',
      description: '',
      customerName: '',
      customerEmail: '',
      customerContact: '',
    };
  }

  closeForm() {
    this.showForm = false;
  }

  initiatePayment() {
    const amountRs = parseFloat(this.form.amountRs);
    if (!amountRs || amountRs <= 0) {
      this.formError = 'Enter a valid amount';
      return;
    }
    this.formError = '';
    this.paying = true;

    const amountPaise = Math.round(amountRs * 100);

    this.svc
      .createOrder({
        amount: amountPaise,
        description: this.form.description,
        customerName: this.form.customerName,
        customerEmail: this.form.customerEmail,
        customerContact: this.form.customerContact,
      })
      .subscribe({
        next: (order) => {
          this.paying = false;
          this.openRazorpayCheckout(order);
        },
        error: (err) => {
          this.formError = err?.error?.error || 'Failed to create order';
          this.paying = false;
        },
      });
  }

  private openRazorpayCheckout(order: any) {
    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'HDFC Collect Now',
      description: order.description || 'Payment',
      order_id: order.orderId,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
        contact: order.customerContact,
      },
      theme: { color: '#4f46e5' },
      handler: (response: any) => {
        this.verifyPayment(response);
      },
      modal: {
        ondismiss: () => {
          this.formError = 'Payment was cancelled';
          this.paying = false;
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  private verifyPayment(response: any) {
    this.paying = true;
    this.svc
      .verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
      .subscribe({
        next: () => {
          this.paying = false;
          this.showForm = false;
          this.successMsg = 'Payment successful!';
          this.page = 1;
          this.load();
        },
        error: (err) => {
          this.formError = err?.error?.error || 'Payment verification failed';
          this.paying = false;
        },
      });
  }

  amountInRs(paise: number): string {
    return (paise / 100).toFixed(2);
  }

  statusClass(status: string): string {
    return (
      {
        paid: 'bg-green-100 text-green-700',
        failed: 'bg-red-100 text-red-700',
        created: 'bg-yellow-100 text-yellow-700',
        attempted: 'bg-blue-100 text-blue-700',
      }[status] || 'bg-gray-100 text-gray-600'
    );
  }
}
