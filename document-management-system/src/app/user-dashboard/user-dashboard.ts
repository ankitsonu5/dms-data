import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../user/user.service';
import { PaymentService, PaymentRecord } from '../payments/payment.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          // Navigates away to Razorpay's hosted page; the result comes back
          // via the server-side callback and the /payment-status route.
          this.paymentSvc.submitHostedCheckout(order);
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
