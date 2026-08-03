import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  checkoutUrl: string;
  merchantName: string;
  callbackUrl: string;
  cancelUrl: string;
}

export interface PaymentRecord {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  status: 'created' | 'attempted' | 'paid' | 'failed';
  receipt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusResult {
  status: 'paid' | 'failed' | 'cancelled' | 'attempted' | string;
  order_id?: string;
  payment_id?: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = '';

  constructor(private http: HttpClient) {}

  createOrder(payload: {
    amount: number;
    description?: string;
    customerName?: string;
    customerEmail?: string;
    customerContact?: string;
  }): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(
      `${this.api}/payments/create-order`,
      payload
    );
  }

  /**
   * Razorpay Hosted Checkout: the options are submitted as form-data in a
   * top-level POST, which navigates the browser to Razorpay's hosted payment
   * page. Razorpay then posts the result back to callback_url server-side, so
   * there is no client-side handler and no signature verification in the browser.
   */
  submitHostedCheckout(order: CreateOrderResponse): void {
    const fields: Record<string, string> = {
      key_id: order.keyId,
      amount: String(order.amount),
      currency: order.currency,
      order_id: order.orderId,
      name: order.merchantName,
      description: order.description || 'Payment',
      'prefill[name]': order.customerName || '',
      'prefill[email]': order.customerEmail || '',
      'prefill[contact]': order.customerContact || '',
      callback_url: order.callbackUrl,
      cancel_url: `${order.cancelUrl}?order_id=${encodeURIComponent(
        order.orderId
      )}`,
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = order.checkoutUrl;
    form.style.display = 'none';

    for (const [name, value] of Object.entries(fields)) {
      if (!value) continue;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  myPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.api}/payments/my`);
  }

  list(
    params: { page?: number; limit?: number; status?: string } = {}
  ): Observable<{ items: PaymentRecord[]; total: number }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    const url = `${this.api}/payments?${query.toString()}`;
    return new Observable((observer) => {
      this.http.get<PaymentRecord[]>(url, { observe: 'response' }).subscribe({
        next: (resp) => {
          const items = resp.body || [];
          const total = Number(
            resp.headers.get('X-Total-Count') || items.length
          );
          observer.next({ items, total });
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}
