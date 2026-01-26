import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { config } from 'dotenv';
import { createEncryptionService } from './lib/encryption.js';
import { authRoutes } from './routes/auth.js';
import { integrationsRoutes } from './routes/integrations.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { settingsRoutes } from './routes/settings.js';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-min-32-chars-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Warning: Using default JWT_SECRET. Set JWT_SECRET environment variable in production!');
}

if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️  Warning: Using default ENCRYPTION_KEY. Set ENCRYPTION_KEY environment variable in production!');
}

const encryptionService = createEncryptionService(ENCRYPTION_KEY);

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: JWT_SECRET,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

if (process.env.NODE_ENV === 'development') {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'HomelabFlix API',
        version: '0.1.0',
      },
    },
  });
}

// Authentication decorator
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(
  async (instance) => {
    await integrationsRoutes(instance, encryptionService);
  },
  { prefix: '/api/integrations' }
);
await fastify.register(
  async (instance) => {
    await dashboardRoutes(instance, encryptionService);
  },
  { prefix: '/api/dashboard' }
);
await fastify.register(settingsRoutes, { prefix: '/api/settings' });

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`📚 Swagger docs: http://${HOST}:${PORT}/documentation`);
  }
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});
