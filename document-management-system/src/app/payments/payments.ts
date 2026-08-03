import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRecord } from './payment.service';
import { SharedModule } from '../shared/shared.module';

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
          // Navigates away to Razorpay's hosted page; the result comes back
          // via the server-side callback and the /payment-status route.
          this.svc.submitHostedCheckout(order);
        },
        error: (err) => {
          this.formError = err?.error?.error || 'Failed to create order';
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
