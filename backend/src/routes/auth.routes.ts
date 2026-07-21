import type { FastifyInstance } from 'fastify';
import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword, registerSchema, loginSchema } from '../utils/helpers.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '1h' });
    const refreshToken = app.jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { user, token, refreshToken };
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '1h' }
    );
    const refreshToken = app.jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      refreshToken,
    };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        addresses: true,
      },
    });
    return { user };
  });
}
