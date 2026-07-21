import type { FastifyInstance } from 'fastify';
import { prisma } from '../config/database.js';

export async function couponRoutes(app: FastifyInstance) {
  app.post('/validate', async (request, reply) => {
    const { code, subtotal } = request.body as { code: string; subtotal: number };
    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        restaurantId: restaurant.id,
        isActive: true,
      },
    });

    if (!coupon) return reply.status(404).send({ error: 'Invalid coupon code' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Coupon has expired' });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return reply.status(400).send({ error: 'Coupon usage limit reached' });
    }
    if (subtotal < coupon.minOrder) {
      return reply.status(400).send({
        error: `Minimum order of ₦${coupon.minOrder.toLocaleString()} required`,
      });
    }

    const discount =
      coupon.type === 'PERCENTAGE' ? (subtotal * coupon.value) / 100 : coupon.value;

    return { coupon, discount, valid: true };
  });
}
