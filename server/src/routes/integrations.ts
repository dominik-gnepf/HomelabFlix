import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/database.js';
import { EncryptionService } from '../lib/encryption.js';
import { adapterRegistry } from '../adapters/index.js';

const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  adapterId: z.string(),
  config: z.record(z.unknown()),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export async function integrationsRoutes(
  fastify: FastifyInstance,
  encryptionService: EncryptionService
) {
  // List all integrations
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const integrations = await prisma.integration.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
      });

      // Decrypt config for each integration
      const decryptedIntegrations = integrations.map(integration => ({
        ...integration,
        config: encryptionService.decryptObject(integration.config),
      }));

      return decryptedIntegrations;
    } catch (error) {
      console.error('List integrations error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single integration
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          id: request.params.id,
          userId: request.user.id,
        },
      });

      if (!integration) {
        return reply.code(404).send({ error: 'Integration not found' });
      }

      return {
        ...integration,
        config: encryptionService.decryptObject(integration.config),
      };
    } catch (error) {
      console.error('Get integration error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create integration
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { name, adapterId, config } = createIntegrationSchema.parse(request.body);

      const adapter = adapterRegistry.getAdapter(adapterId);
      if (!adapter) {
        return reply.code(400).send({ error: 'Invalid adapter' });
      }

      if (!adapter.validateConfig(config)) {
        return reply.code(400).send({ error: 'Invalid configuration' });
      }

      const encryptedConfig = encryptionService.encryptObject(config);

      const integration = await prisma.integration.create({
        data: {
          name,
          adapterId,
          category: adapter.metadata.category,
          config: encryptedConfig,
          userId: request.user.id,
        },
      });

      return {
        ...integration,
        config,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      console.error('Create integration error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update integration
  fastify.put('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { name, config, enabled } = updateIntegrationSchema.parse(request.body);

      const integration = await prisma.integration.findFirst({
        where: {
          id: request.params.id,
          userId: request.user.id,
        },
      });

      if (!integration) {
        return reply.code(404).send({ error: 'Integration not found' });
      }

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (enabled !== undefined) updateData.enabled = enabled;
      
      if (config !== undefined) {
        const adapter = adapterRegistry.getAdapter(integration.adapterId);
        if (adapter && !adapter.validateConfig(config)) {
          return reply.code(400).send({ error: 'Invalid configuration' });
        }
        updateData.config = encryptionService.encryptObject(config);
      }

      const updated = await prisma.integration.update({
        where: { id: request.params.id },
        data: updateData,
      });

      return {
        ...updated,
        config: encryptionService.decryptObject(updated.config),
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      console.error('Update integration error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete integration
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          id: request.params.id,
          userId: request.user.id,
        },
      });

      if (!integration) {
        return reply.code(404).send({ error: 'Integration not found' });
      }

      await prisma.integration.delete({
        where: { id: request.params.id },
      });

      return { success: true };
    } catch (error) {
      console.error('Delete integration error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get integration metrics
  fastify.get('/:id/metrics', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          id: request.params.id,
          userId: request.user.id,
        },
      });

      if (!integration) {
        return reply.code(404).send({ error: 'Integration not found' });
      }

      if (!integration.enabled) {
        return reply.code(400).send({ error: 'Integration is disabled' });
      }

      const adapter = adapterRegistry.getAdapter(integration.adapterId);
      if (!adapter) {
        return reply.code(400).send({ error: 'Adapter not found' });
      }

      const config = encryptionService.decryptObject(integration.config);
      
      const metrics = await adapter.fetchMetrics({
        id: integration.id,
        name: integration.name,
        adapterId: integration.adapterId,
        config,
      });

      return metrics;
    } catch (error) {
      console.error('Get metrics error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // List available adapters
  fastify.get('/adapters/list', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return adapterRegistry.getAdapterMetadata();
    } catch (error) {
      console.error('List adapters error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
