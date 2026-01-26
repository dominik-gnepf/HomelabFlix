import { Adapter } from './base.js';
import { UptimeKumaAdapter } from './uptime-kuma.js';
import { PortainerAdapter } from './portainer.js';
import { ProxmoxAdapter } from './proxmox.js';
import { OPNsenseAdapter } from './opnsense.js';
import { UniFiAdapter } from './unifi.js';
import {
  PiHoleAdapter,
  TrueNASAdapter,
  SynologyAdapter,
  PlexAdapter,
  EmbyAdapter,
  JellyfinAdapter,
  HomeAssistantAdapter,
  AdGuardAdapter,
  GrafanaAdapter,
  PrometheusAdapter,
  NextcloudAdapter,
  MinecraftAdapter,
  NginxProxyManagerAdapter,
  CaddyAdapter,
  TraefikAdapter,
} from './placeholders.js';

export class AdapterRegistry {
  private adapters: Map<string, Adapter>;

  constructor() {
    this.adapters = new Map();
    this.registerAdapters();
  }

  private registerAdapters(): void {
    // Implemented adapters
    this.register(new UptimeKumaAdapter());
    this.register(new PortainerAdapter());
    this.register(new ProxmoxAdapter());
    this.register(new OPNsenseAdapter());
    this.register(new UniFiAdapter());

    // Placeholder adapters
    this.register(new PiHoleAdapter());
    this.register(new TrueNASAdapter());
    this.register(new SynologyAdapter());
    this.register(new PlexAdapter());
    this.register(new EmbyAdapter());
    this.register(new JellyfinAdapter());
    this.register(new HomeAssistantAdapter());
    this.register(new AdGuardAdapter());
    this.register(new GrafanaAdapter());
    this.register(new PrometheusAdapter());
    this.register(new NextcloudAdapter());
    this.register(new MinecraftAdapter());
    this.register(new NginxProxyManagerAdapter());
    this.register(new CaddyAdapter());
    this.register(new TraefikAdapter());
  }

  private register(adapter: Adapter): void {
    this.adapters.set(adapter.metadata.id, adapter);
  }

  getAdapter(id: string): Adapter | undefined {
    return this.adapters.get(id);
  }

  getAllAdapters(): Adapter[] {
    return Array.from(this.adapters.values());
  }

  getAdapterMetadata() {
    return this.getAllAdapters().map(adapter => adapter.metadata);
  }

  getAdaptersByCategory(category: string): Adapter[] {
    return this.getAllAdapters().filter(
      adapter => adapter.metadata.category === category
    );
  }
}

export const adapterRegistry = new AdapterRegistry();
