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

  app.get('/orders', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER', 'KITCHEN_STAFF'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        items: { include: { food: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { orders };
  });

  app.patch('/orders/:id/status', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER', 'KITCHEN_STAFF'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const validStatuses = [
      'RECEIVED',
      'PREPARING',
      'COOKING',
      'PACKING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status as never,
        statusHistory: { create: { status: status as never } },
      },
      include: {
        items: { include: { food: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    return { order };
  });

  app.patch('/foods/:id', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = request.body as {
      isAvailable?: boolean;
      isPopular?: boolean;
      isNew?: boolean;
      name?: string;
    };

    const food = await prisma.food.update({
      where: { id },
      data: {
        ...(body.isAvailable !== undefined && { isAvailable: body.isAvailable }),
        ...(body.isPopular !== undefined && { isPopular: body.isPopular }),
        ...(body.isNew !== undefined && { isNew: body.isNew }),
        ...(body.name !== undefined && { name: body.name }),
      },
      include: {
        category: true,
        portions: { include: { portion: true } },
      },
    });
    return { food };
  });

  app.get('/categories', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id },
      include: { _count: { select: { foods: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { categories };
  });

  app.patch('/categories/:id', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = request.body as { isActive?: boolean; name?: string };

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.name !== undefined && { name: body.name }),
      },
      include: { _count: { select: { foods: true } } },
    });
    return { category };
  });

  app.get('/customers', async (request, reply) => {
    const payload = request.user as { role: string };
    if (!['OWNER', 'MANAGER'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return reply.status(404).send({ error: 'Restaurant not found' });

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id, status: { not: 'CANCELLED' } },
      select: {
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        total: true,
      },
    });

    const map = new Map<
      string,
      { email: string; name: string; phone: string; orders: number; totalSpent: number }
    >();
    for (const order of orders) {
      const key = order.customerEmail.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.orders += 1;
        existing.totalSpent += order.total;
      } else {
        map.set(key, {
          email: order.customerEmail,
          name: order.customerName,
          phone: order.customerPhone,
          orders: 1,
          totalSpent: order.total,
        });
      }
    }

    return {
      customers: [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent),
    };
  });
}
