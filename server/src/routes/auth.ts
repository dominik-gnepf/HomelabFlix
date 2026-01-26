import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import prisma from '../lib/database.js';

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username, password } = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      return {
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      console.error('Login error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username, email, password } = registerSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
        },
      });

      // Create default settings
      await prisma.settings.create({
        data: {
          userId: user.id,
        },
      });

      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      return {
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      console.error('Register error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
