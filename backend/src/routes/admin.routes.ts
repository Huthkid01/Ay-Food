import type { FastifyInstance } from 'fastify';
import { prisma } from '../config/database.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/dashboard', async (request, reply) => {
    const payload = request.user as { id: string; role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyOrders, weeklyOrders, monthlyOrders, recentOrders, popularFoods, totalCustomers] =
      await Promise.all([
        prisma.order.findMany({
          where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
        }),
        prisma.order.findMany({
          where: { restaurantId: restaurant.id, createdAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
        }),
        prisma.order.findMany({
          where: { restaurantId: restaurant.id, createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        }),
        prisma.order.findMany({
          where: { restaurantId: restaurant.id },
          include: { items: { include: { food: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.orderItem.groupBy({
          by: ['foodId'],
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
      ]);

    const sum = (orders: { total: number }[]) => orders.reduce((s, o) => s + o.total, 0);

    const popularFoodIds = popularFoods.map((f) => f.foodId);
    const foods = await prisma.food.findMany({
      where: { id: { in: popularFoodIds } },
      select: { id: true, name: true, image: true },
    });

    return {
      analytics: {
        dailySales: sum(dailyOrders),
        weeklySales: sum(weeklyOrders),
        monthlySales: sum(monthlyOrders),
        dailyOrders: dailyOrders.length,
        weeklyOrders: weeklyOrders.length,
        monthlyOrders: monthlyOrders.length,
        totalCustomers,
      },
      recentOrders,
      popularMeals: popularFoods.map((pf) => ({
        ...foods.find((f) => f.id === pf.foodId),
        totalSold: pf._sum.quantity,
      })),
    };
  });

  app.get('/foods', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER', 'KITCHEN_STAFF'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const foods = await prisma.food.findMany({
      include: {
        category: true,
        portions: { include: { portion: true } },
      },
      orderBy: { name: 'asc' },
    });
    return { foods };
  });

  app.get('/inventory', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });
    const lowStock = items.filter((i) => i.quantity <= i.minStock);
    return { items, lowStock };
  });
}
