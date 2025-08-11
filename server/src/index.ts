import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Healthcheck
  app.get('/api/health', async () => ({ ok: true, service: 'homelabflix-server' }));

  // Placeholder tiles
  app.get('/api/tiles', async () => ({ tiles: [] }));

  const port = Number(process.env.PORT || 8787);
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
