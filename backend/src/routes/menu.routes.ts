import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';

export async function menuRoutes(app: FastifyInstance) {
  app.get('/restaurant', async () => {
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: 'ay-food', isActive: true },
      include: { settings: true },
    });
    return { restaurant };
  });

  app.get('/categories', async () => {
    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return { categories: [] };

    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { foods: true } } },
    });
    return { categories };
  });

  app.get('/foods', async (request) => {
    const query = request.query as Record<string, string | undefined>;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const category = query.category;
    const search = query.search?.toLowerCase();
    const sort = query.sort ?? 'popular';

    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return { foods: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    const where = {
      restaurantId: restaurant.id,
      isAvailable: true,
      ...(category && { category: { slug: category } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { tags: { contains: search } },
        ],
      }),
    };

    const orderBy =
      sort === 'price-asc'
        ? { portions: { _count: 'asc' as const } }
        : sort === 'newest'
          ? { createdAt: 'desc' as const }
          : { isPopular: 'desc' as const };

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        include: {
          category: { select: { name: true, slug: true } },
          portions: {
            include: { portion: true },
            orderBy: { portion: { sortOrder: 'asc' } },
          },
        },
        orderBy: sort === 'newest' ? { createdAt: 'desc' } : { isPopular: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.food.count({ where }),
    ]);

    return {
      foods,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.get('/foods/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const food = await prisma.food.findFirst({
      where: { slug, isAvailable: true },
      include: {
        category: true,
        portions: {
          include: { portion: true },
          orderBy: { portion: { sortOrder: 'asc' } },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!food) return reply.status(404).send({ error: 'Food not found' });
    return { food };
  });

  app.get('/portions', async () => {
    const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'ay-food' } });
    if (!restaurant) return { portions: [] };
    const portions = await prisma.portionTemplate.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: 'asc' },
    });
    return { portions };
  });

  app.get('/recommendations', async (request) => {
    const query = request.query as { budget?: string; timeOfDay?: string };
    const budget = Number(query.budget) || 5000;

    const foods = await prisma.food.findMany({
      where: {
        isAvailable: true,
        isPopular: true,
        portions: { some: { price: { lte: budget } } },
      },
      include: {
        category: true,
        portions: { include: { portion: true }, orderBy: { portion: { sortOrder: 'asc' } } },
      },
      take: 8,
    });
    return { recommendations: foods };
  });
}
