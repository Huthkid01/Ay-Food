import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { generateOrderNumber } from '../utils/helpers.js';

const orderItemSchema = z.object({
  foodId: z.string(),
  foodPortionId: z.string().optional(),
  portionName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
  packName: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  orderType: z.enum(['DELIVERY', 'PICKUP']),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email(),
  deliveryAddress: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  packFees: z.number().min(0).optional().default(0),
  paymentProvider: z.enum(['STRIPE', 'FLUTTERWAVE', 'PAYSTACK', 'CASH']).default('PAYSTACK'),
});

export async function orderRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const body = createOrderSchema.parse(request.body);
    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const itemsSubtotal = body.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const subtotal = itemsSubtotal + (body.packFees ?? 0);
    let discount = 0;

    if (body.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: body.couponCode.toUpperCase(),
          restaurantId: restaurant.id,
          isActive: true,
        },
      });
      if (coupon && subtotal >= coupon.minOrder) {
        discount =
          coupon.type === 'PERCENTAGE'
            ? (subtotal * coupon.value) / 100
            : coupon.value;
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const settings = await prisma.restaurantSetting.findUnique({
      where: { restaurantId: restaurant.id },
    });
    const tax = (subtotal * restaurant.taxRate) / 100;
    const deliveryFee =
      body.orderType === 'DELIVERY' ? (settings?.defaultDeliveryFee ?? 1500) : 0;
    const total = subtotal + tax + deliveryFee - discount;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        restaurantId: restaurant.id,
        orderType: body.orderType,
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        deliveryAddress: body.deliveryAddress,
        deliveryInstructions: body.deliveryInstructions,
        couponCode: body.couponCode,
        notes: body.notes,
        items: {
          create: body.items.map((item) => ({
            foodId: item.foodId,
            foodPortionId: item.foodPortionId,
            portionName: item.portionName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            notes: item.notes,
            packName: item.packName,
          })),
        },
        statusHistory: {
          create: { status: 'RECEIVED', note: 'Order received' },
        },
      },
      include: { items: { include: { food: true } } },
    });

    return { order };
  });

  app.get('/:orderNumber/track', async (request, reply) => {
    const { orderNumber } = request.params as { orderNumber: string };
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        items: { include: { food: true } },
      },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    return { order };
  });

  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as { id: string };
    const orders = await prisma.order.findMany({
      where: { userId: payload.id },
      include: { items: { include: { food: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { orders };
  });

  app.patch('/:id/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = ['RECEIVED', 'PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status as never,
        statusHistory: { create: { status: status as never } },
      },
      include: { statusHistory: true },
    });
    return { order };
  });
}
