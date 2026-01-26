import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/database.js';

const updateSettingsSchema = z.object({
  refreshRate: z.number().min(5).max(300).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  layout: z.enum(['rows', 'grid']).optional(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get settings
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let settings = await prisma.settings.findUnique({
        where: { userId: request.user.id },
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.settings.create({
          data: {
            userId: request.user.id,
          },
        });
      }

      return settings;
    } catch (error) {
      console.error('Get settings error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update settings
  fastify.put('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = updateSettingsSchema.parse(request.body);

      const settings = await prisma.settings.upsert({
        where: { userId: request.user.id },
        update: data,
        create: {
          userId: request.user.id,
          ...data,
        },
      });

      return settings;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      console.error('Update settings error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
