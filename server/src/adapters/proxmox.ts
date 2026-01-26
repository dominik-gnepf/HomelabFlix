import axios from 'axios';
import https from 'https';
import type { IntegrationConfig, TileData } from '../../../packages/types/index.js';
import { BaseAdapter } from './base.js';

export class ProxmoxAdapter extends BaseAdapter {
  metadata = {
    id: 'proxmox',
    name: 'Proxmox VE',
    category: 'Compute',
    description: 'Monitor Proxmox VE nodes, VMs, and containers',
    configSchema: {
      url: {
        type: 'url' as const,
        label: 'Proxmox URL',
        required: true,
        placeholder: 'https://proxmox.example.com:8006',
        description: 'Base URL of your Proxmox instance',
      },
      tokenId: {
        type: 'string' as const,
        label: 'Token ID',
        required: true,
        placeholder: 'user@pam!tokenname',
        description: 'Proxmox API token ID',
      },
      tokenSecret: {
        type: 'password' as const,
        label: 'Token Secret',
        required: true,
        description: 'Proxmox API token secret',
      },
      node: {
        type: 'string' as const,
        label: 'Node Name',
        required: false,
        placeholder: 'pve',
        description: 'Specific node to monitor (optional)',
      },
      verifySSL: {
        type: 'boolean' as const,
        label: 'Verify SSL',
        required: false,
        default: true,
      },
    },
    implemented: true,
  };

  async fetchMetrics(config: IntegrationConfig): Promise<TileData> {
    try {
      const { url, tokenId, tokenSecret, node, verifySSL = true } = config.config as {
        url: string;
        tokenId: string;
        tokenSecret: string;
        node?: string;
        verifySSL?: boolean;
      };

      const baseUrl = url.replace(/\/$/, '');
      
      const axiosConfig = {
        headers: {
          'Authorization': `PVEAPIToken=${tokenId}=${tokenSecret}`,
        },
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: verifySSL,
        }),
      };

      // Fetch cluster resources
      const response = await axios.get(`${baseUrl}/api2/json/cluster/resources`, axiosConfig);
      
      const resources = response.data.data;
      
      // Filter by node if specified
      const filteredResources = node
        ? resources.filter((r: any) => r.node === node)
        : resources;

      const nodes = filteredResources.filter((r: any) => r.type === 'node');
      const vms = filteredResources.filter((r: any) => r.type === 'qemu');
      const containers = filteredResources.filter((r: any) => r.type === 'lxc');
      
      const runningVMs = vms.filter((vm: any) => vm.status === 'running').length;
      const runningContainers = containers.filter((ct: any) => ct.status === 'running').length;
      const onlineNodes = nodes.filter((n: any) => n.status === 'online').length;

      const totalMemory = nodes.reduce((sum: number, n: any) => sum + (n.maxmem || 0), 0);
      const usedMemory = nodes.reduce((sum: number, n: any) => sum + (n.mem || 0), 0);
      const memoryUsage = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

      return this.createTileData(
        config.id,
        config.name,
        'Compute',
        onlineNodes === nodes.length ? 'online' : 'warning',
        [
          { label: 'Nodes Online', value: `${onlineNodes}/${nodes.length}`, type: 'text' },
          { label: 'VMs Running', value: `${runningVMs}/${vms.length}`, type: 'text' },
          { label: 'Containers Running', value: `${runningContainers}/${containers.length}`, type: 'text' },
          { label: 'Memory Usage', value: memoryUsage, unit: '%', type: 'percentage' },
        ]
      );
    } catch (error) {
      console.error('Proxmox adapter error:', error);
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
