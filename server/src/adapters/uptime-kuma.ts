import axios from 'axios';
import type { IntegrationConfig, TileData } from '../../../packages/types/index.js';
import { BaseAdapter } from './base.js';

export class UptimeKumaAdapter extends BaseAdapter {
  metadata = {
    id: 'uptime-kuma',
    name: 'Uptime Kuma',
    category: 'Monitoring',
    description: 'Monitor uptime and status of your services',
    configSchema: {
      url: {
        type: 'url' as const,
        label: 'Uptime Kuma URL',
        required: true,
        placeholder: 'https://uptime.example.com',
        description: 'Base URL of your Uptime Kuma instance',
      },
      username: {
        type: 'string' as const,
        label: 'Username',
        required: false,
        placeholder: 'admin',
      },
      password: {
        type: 'password' as const,
        label: 'Password',
        required: false,
      },
    },
    implemented: true,
  };

  async fetchMetrics(config: IntegrationConfig): Promise<TileData> {
    try {
      const { url, username, password } = config.config as {
        url: string;
        username?: string;
        password?: string;
      };

      const baseUrl = url.replace(/\/$/, '');
      
      // Try to fetch status page or API
      const auth = username && password
        ? { auth: { username, password } }
        : {};

      // Uptime Kuma status API endpoint
      const response = await axios.get(`${baseUrl}/api/status-page/heartbeat`, {
        ...auth,
        timeout: 10000,
        validateStatus: () => true,
      });

      if (response.status === 200 && response.data) {
        const monitors = Array.isArray(response.data) ? response.data : [];
        const upCount = monitors.filter((m: any) => m.status === 1).length;
        const downCount = monitors.filter((m: any) => m.status === 0).length;
        
        return this.createTileData(
          config.id,
          config.name,
          'Monitoring',
          downCount > 0 ? 'warning' : 'online',
          [
            { label: 'Total Monitors', value: monitors.length, type: 'number' },
            { label: 'Up', value: upCount, type: 'number' },
            { label: 'Down', value: downCount, type: 'number' },
            { label: 'Uptime', value: monitors.length > 0 ? Math.round((upCount / monitors.length) * 100) : 0, unit: '%', type: 'percentage' },
          ]
        );
      }

      // Fallback: Just check if the instance is reachable
      const healthResponse = await axios.get(baseUrl, {
        ...auth,
        timeout: 10000,
        validateStatus: () => true,
      });

      return this.createTileData(
        config.id,
        config.name,
        'Monitoring',
        healthResponse.status === 200 ? 'online' : 'offline',
        [
          { label: 'Status', value: healthResponse.status === 200 ? 'Reachable' : 'Unreachable', type: 'text' },
          { label: 'Response Code', value: healthResponse.status, type: 'number' },
        ]
      );
    } catch (error) {
      console.error('Uptime Kuma adapter error:', error);
      return this.createTileData(
        config.id,
        config.name,
        'Monitoring',
        'offline',
        [
          { label: 'Status', value: 'Error', type: 'text' },
          { label: 'Error', value: error instanceof Error ? error.message : 'Unknown error', type: 'text' },
        ]
      );
    }
  }
}
