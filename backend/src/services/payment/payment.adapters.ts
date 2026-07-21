import type { PaymentGateway, PaymentInitRequest, PaymentInitResponse, PaymentVerifyResponse } from './payment.interface.js';

export class StripeAdapter implements PaymentGateway {
  name = 'STRIPE';

  async initializePayment(data: PaymentInitRequest): Promise<PaymentInitResponse> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return {
        success: true,
        reference: data.reference,
        authorizationUrl: `https://checkout.stripe.com/demo?ref=${data.reference}&amount=${data.amount}`,
        message: 'Demo mode - configure STRIPE_SECRET_KEY for production',
      };
    }
    return {
      success: true,
      reference: data.reference,
      authorizationUrl: `https://checkout.stripe.com/pay/${data.reference}`,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return { success: true, status: 'completed', amount: 0, reference };
  }
}

export class FlutterwaveAdapter implements PaymentGateway {
  name = 'FLUTTERWAVE';

  async initializePayment(data: PaymentInitRequest): Promise<PaymentInitResponse> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      return {
        success: true,
        reference: data.reference,
        authorizationUrl: `https://checkout.flutterwave.com/demo?ref=${data.reference}`,
        message: 'Demo mode - configure FLUTTERWAVE_SECRET_KEY for production',
      };
    }
    return {
      success: true,
      reference: data.reference,
      authorizationUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${data.reference}`,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return { success: true, status: 'completed', amount: 0, reference };
  }
}

export class PaystackAdapter implements PaymentGateway {
  name = 'PAYSTACK';

  async initializePayment(data: PaymentInitRequest): Promise<PaymentInitResponse> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return {
        success: true,
        reference: data.reference,
        authorizationUrl: `https://checkout.paystack.com/demo?ref=${data.reference}&amount=${data.amount * 100}`,
        message: 'Demo mode - configure PAYSTACK_SECRET_KEY for production',
      };
    }
    return {
      success: true,
      reference: data.reference,
      authorizationUrl: `https://checkout.paystack.com/${data.reference}`,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return { success: true, status: 'completed', amount: 0, reference };
  }
}

export function getPaymentGateway(provider: string): PaymentGateway {
  switch (provider.toUpperCase()) {
    case 'STRIPE':
      return new StripeAdapter();
    case 'FLUTTERWAVE':
      return new FlutterwaveAdapter();
    case 'PAYSTACK':
    default:
      return new PaystackAdapter();
  }
}
