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

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

  verifyPayment(
    payload: VerifyPaymentPayload
  ): Observable<{ ok: boolean; payment: PaymentRecord }> {
    return this.http.post<{ ok: boolean; payment: PaymentRecord }>(
      `${this.api}/payments/verify`,
      payload
    );
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
