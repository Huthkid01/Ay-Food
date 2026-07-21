import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { generatePaymentReference } from '../utils/helpers.js';
import { getPaymentGateway } from '../services/payment/payment.adapters.js';

const initPaymentSchema = z.object({
  orderId: z.string(),
  provider: z.enum(['STRIPE', 'FLUTTERWAVE', 'PAYSTACK']).default('PAYSTACK'),
});

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/initialize', async (request, reply) => {
    const body = initPaymentSchema.parse(request.body);
    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) return reply.status(404).send({ error: 'Order not found' });

    const reference = generatePaymentReference();
    const gateway = getPaymentGateway(body.provider);

    const result = await gateway.initializePayment({
      amount: order.total,
      currency: 'NGN',
      email: order.customerEmail,
      reference,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: body.provider,
        amount: order.total,
        reference,
        status: 'PENDING',
      },
    });

    return { payment, ...result };
  });

  app.post('/verify/:reference', async (request, reply) => {
    const { reference } = request.params as { reference: string };
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });
    if (!payment) return reply.status(404).send({ error: 'Payment not found' });

    const gateway = getPaymentGateway(payment.provider);
    const result = await gateway.verifyPayment(reference);

    const status = result.success ? 'COMPLETED' : 'FAILED';
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status, providerRef: result.providerRef },
    });

    if (result.success) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          statusHistory: { create: { status: 'PREPARING', note: 'Payment confirmed' } },
        },
      });
    }

    return { payment: { ...payment, status }, verified: result.success };
  });
}
