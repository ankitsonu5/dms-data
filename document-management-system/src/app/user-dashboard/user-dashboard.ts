import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../user/user.service';
import { PaymentService, PaymentRecord } from '../payments/payment.service';

declare const Razorpay: any;

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-dashboard.html',
})
export class UserDashboardComponent implements OnInit {
  payments: PaymentRecord[] = [];
  loading = false;
  error = '';
  successMsg = '';

  showForm = false;
  form = { amountRs: '', description: '' };
  formError = '';
  paying = false;

  constructor(
    public userSvc: UserService,
    private paymentSvc: PaymentService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.loading = true;
    this.paymentSvc.myPayments().subscribe({
      next: (items) => {
        this.payments = items;
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load payment history';
        this.loading = false;
      },
    });
  }

  logout() {
    this.userSvc.logout();
    this.router.navigate(['/']);
  }

  openForm() {
    this.showForm = true;
    this.formError = '';
    this.successMsg = '';
    this.form = { amountRs: '', description: '' };
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
    const user = this.userSvc.userInfo;

    this.paymentSvc
      .createOrder({
        amount: Math.round(amountRs * 100),
        description: this.form.description,
        customerName: user?.name || '',
        customerEmail: user?.email || '',
      })
      .subscribe({
        next: (order) => {
          this.paying = false;
          this.openCheckout(order);
        },
        error: (err) => {
          this.formError = err?.error?.error || 'Failed to create order';
          this.paying = false;
        },
      });
  }

  private openCheckout(order: any) {
    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'U P Awas Evam Vikas Parishad',
      description: order.description || 'Payment',
      order_id: order.orderId,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
      },
      theme: { color: '#4f46e5' },
      handler: (response: any) => this.verifyPayment(response),
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
    this.paymentSvc
      .verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
      .subscribe({
        next: () => {
          this.paying = false;
          this.showForm = false;
          this.successMsg =
            'Payment successful! Your receipt has been recorded.';
          this.loadPayments();
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
