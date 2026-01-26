import axios from 'axios';
import type { IntegrationConfig, TileData } from '../../../packages/types/index.js';
import { BaseAdapter } from './base.js';

export class PortainerAdapter extends BaseAdapter {
  metadata = {
    id: 'portainer',
    name: 'Portainer',
    category: 'Compute',
    description: 'Monitor Docker containers and stacks',
    configSchema: {
      url: {
        type: 'url' as const,
        label: 'Portainer URL',
        required: true,
        placeholder: 'https://portainer.example.com',
        description: 'Base URL of your Portainer instance',
      },
      apiKey: {
        type: 'password' as const,
        label: 'API Key',
        required: true,
        description: 'Portainer API key (X-API-Key)',
      },
    },
    implemented: true,
  };

  async fetchMetrics(config: IntegrationConfig): Promise<TileData> {
    try {
      const { url, apiKey } = config.config as {
        url: string;
        apiKey: string;
      };

      const baseUrl = url.replace(/\/$/, '');
      
      // Fetch endpoints
      const endpointsResponse = await axios.get(`${baseUrl}/api/endpoints`, {
        headers: {
          'X-API-Key': apiKey,
        },
        timeout: 10000,
      });

      const endpoints = endpointsResponse.data;
      
      if (!Array.isArray(endpoints) || endpoints.length === 0) {
        return this.createTileData(
          config.id,
          config.name,
          'Compute',
          'warning',
          [
            { label: 'Endpoints', value: 0, type: 'number' },
            { label: 'Status', value: 'No endpoints found', type: 'text' },
          ]
        );
      }

      // Get first endpoint details
      const endpointId = endpoints[0].Id;
      const containersResponse = await axios.get(
        `${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=true`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
          timeout: 10000,
        }
      );

      const containers = containersResponse.data;
      const runningContainers = containers.filter((c: any) => c.State === 'running').length;
      const stoppedContainers = containers.filter((c: any) => c.State === 'exited').length;

      return this.createTileData(
        config.id,
        config.name,
        'Compute',
        stoppedContainers > 0 ? 'warning' : 'online',
        [
          { label: 'Total Containers', value: containers.length, type: 'number' },
          { label: 'Running', value: runningContainers, type: 'number' },
          { label: 'Stopped', value: stoppedContainers, type: 'number' },
          { label: 'Endpoints', value: endpoints.length, type: 'number' },
        ]
      );
    } catch (error) {
      console.error('Portainer adapter error:', error);
      return this.createTileData(
        config.id,
        config.name,
        'Compute',
        'offline',
        [
          { label: 'Status', value: 'Error', type: 'text' },
          { label: 'Error', value: error instanceof Error ? error.message : 'Unknown error', type: 'text' },
        ]
      );
    }
  }
}
