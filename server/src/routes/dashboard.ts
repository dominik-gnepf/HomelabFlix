import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Integration } from '@prisma/client';
import prisma from '../lib/database.js';
import { EncryptionService } from '../lib/encryption.js';
import { adapterRegistry } from '../adapters/index.js';
import type { TileData } from '../../../packages/types/index.js';

export async function dashboardRoutes(
  fastify: FastifyInstance,
  encryptionService: EncryptionService
) {
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const integrations = await prisma.integration.findMany({
        where: {
          userId: request.user.id,
          enabled: true,
        },
      });

      // Fetch metrics for all integrations in parallel
      const metricsPromises = integrations.map(async (integration: Integration) => {
        try {
          const adapter = adapterRegistry.getAdapter(integration.adapterId);
          if (!adapter) {
            return null;
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
          console.error(`Error fetching metrics for ${integration.name}:`, error);
          return null;
        }
      });

      const tiles = (await Promise.all(metricsPromises)).filter(
        (tile): tile is TileData => tile !== null
      );

      // Group by category
      const categories = tiles.reduce((acc, tile) => {
        if (!acc[tile.category]) {
          acc[tile.category] = [];
        }
        acc[tile.category].push(tile);
        return acc;
      }, {} as Record<string, TileData[]>);

      const categoryArray = Object.entries(categories).map(([name, tiles]) => ({
        name,
        tiles,
      }));

      return {
        tiles,
        categories: categoryArray,
      };
    } catch (error) {
      console.error('Dashboard error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
