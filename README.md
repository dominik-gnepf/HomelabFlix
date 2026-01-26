# HomelabFlix 🏠🎬

**Netflix-style dashboard for your homelab** - Monitor all your self-hosted services in one beautiful interface.

## Features

✨ **Netflix-inspired UI** - Dark theme with smooth animations  
🔌 **20+ Adapters** - Proxmox, Portainer, UniFi, OPNsense, and more  
🔒 **Secure** - AES-256-GCM encryption, JWT auth  
📊 **Real-time** - Auto-refreshing metrics  
🐳 **Docker** - Single container deployment  
🚀 **Production Ready** - TypeScript, tests, health checks  

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yourusername/HomelabFlix.git
cd HomelabFlix

# 2. Configure
cp .env.example .env
# Edit .env - set JWT_SECRET, ENCRYPTION_KEY, POSTGRES_PASSWORD

# 3. Generate secure keys
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY

# 4. Start
docker-compose up -d

# 5. Access
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Supported Integrations

### ✅ Implemented
- **Uptime Kuma** - Monitoring
- **Portainer** - Docker containers
- **Proxmox VE** - VMs and containers
- **OPNsense** - Firewall
- **UniFi Network** - Network devices

### 🚧 Coming Soon
Pi-hole, TrueNAS, Synology, Plex, Jellyfin, Emby, Home Assistant, AdGuard, Grafana, Prometheus, Nextcloud, Minecraft, Nginx Proxy Manager, Caddy, Traefik

## Architecture

```
HomelabFlix/
├── client/          # Next.js (port 3000)
├── server/          # Fastify (port 3001)
├── packages/types/  # Shared types
└── docker/          # Docker config
```

## Development

```bash
# Install
cd server && npm install
cd ../client && npm install

# Database
cd server && npm run db:push

# Run
cd server && npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2

# Test
cd server && npm test
```

## Adding New Adapter

```typescript
// server/src/adapters/my-service.ts
import { BaseAdapter } from './base.js';

export class MyServiceAdapter extends BaseAdapter {
  metadata = {
    id: 'my-service',
    name: 'My Service',
    category: 'Apps',
    configSchema: {
      url: { type: 'url', label: 'URL', required: true },
      apiKey: { type: 'password', label: 'API Key', required: true },
    },
    implemented: true,
  };

  async fetchMetrics(config) {
    // Fetch from your service API
    return this.createTileData(config.id, config.name, 'Apps', 'online', [
      { label: 'Status', value: 'Running' },
    ]);
  }
}
```

Register in `server/src/adapters/index.ts`.

## Security

- **Encryption**: AES-256-GCM for secrets
- **Auth**: JWT + rate limiting
- **Passwords**: Bcrypt (12 rounds)

**Best Practices:**
- Use strong, unique keys
- Never commit `.env`
- Backup database regularly
- Use HTTPS in production

### Backup Database

```bash
docker exec homelabflix-db pg_dump -U homelabflix homelabflix > backup.sql
docker exec -i homelabflix-db psql -U homelabflix homelabflix < backup.sql
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `JWT_SECRET` | Yes | JWT key (32+ chars) |
| `ENCRYPTION_KEY` | Yes | Encryption key (32+ chars) |
| `POSTGRES_PASSWORD` | Yes | DB password |

## Troubleshooting

```bash
# Check services
docker ps

# View logs
docker logs homelabflix-app
docker logs homelabflix-db

# Reset
docker-compose down -v && docker-compose up -d
```

## Contributing

PRs welcome! Priority: implementing adapters, tests, UI/UX, docs.

## License

MIT - see [LICENSE](LICENSE)

---

Made with ❤️ for the homelab community
