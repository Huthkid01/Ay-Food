export interface PaymentInitRequest {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  metadata?: Record<string, string>;
}

export interface PaymentInitResponse {
  success: boolean;
  authorizationUrl?: string;
  reference: string;
  providerRef?: string;
  message?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: 'completed' | 'failed' | 'pending';
  amount: number;
  reference: string;
  providerRef?: string;
}

export interface PaymentGateway {
  name: string;
  initializePayment(data: PaymentInitRequest): Promise<PaymentInitResponse>;
  verifyPayment(reference: string): Promise<PaymentVerifyResponse>;
}
