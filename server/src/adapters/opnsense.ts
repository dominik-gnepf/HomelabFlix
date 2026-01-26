import axios from 'axios';
import https from 'https';
import type { IntegrationConfig, TileData } from '../../../packages/types/index.js';
import { BaseAdapter } from './base.js';

export class OPNsenseAdapter extends BaseAdapter {
  metadata = {
    id: 'opnsense',
    name: 'OPNsense',
    category: 'Network',
    description: 'Monitor OPNsense firewall status and interfaces',
    configSchema: {
      url: {
        type: 'url' as const,
        label: 'OPNsense URL',
        required: true,
        placeholder: 'https://opnsense.example.com',
        description: 'Base URL of your OPNsense instance',
      },
      apiKey: {
        type: 'string' as const,
        label: 'API Key',
        required: true,
        description: 'OPNsense API key',
      },
      apiSecret: {
        type: 'password' as const,
        label: 'API Secret',
        required: true,
        description: 'OPNsense API secret',
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
      const { url, apiKey, apiSecret, verifySSL = true } = config.config as {
        url: string;
        apiKey: string;
        apiSecret: string;
        verifySSL?: boolean;
      };

      const baseUrl = url.replace(/\/$/, '');
      
      const axiosConfig = {
        auth: {
          username: apiKey,
          password: apiSecret,
        },
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: verifySSL,
        }),
      };

      // Fetch interface statistics
      const interfacesResponse = await axios.get(
        `${baseUrl}/api/diagnostics/interface/getInterfaceStatistics`,
        axiosConfig
      );

      const interfaces = interfacesResponse.data;
      
      // Fetch gateway status
      let gateways: any = {};
      try {
        const gatewayResponse = await axios.get(
          `${baseUrl}/api/routes/gateway/status`,
          axiosConfig
        );
        gateways = gatewayResponse.data;
      } catch (error) {
        console.warn('Could not fetch gateway status:', error);
      }

      const interfaceCount = Object.keys(interfaces).length;
      const onlineInterfaces = Object.values(interfaces).filter(
        (iface: any) => iface.status === 'up' || iface.link_state === 'up'
      ).length;

      const gatewayCount = Array.isArray(gateways.items) ? gateways.items.length : 0;
      const onlineGateways = Array.isArray(gateways.items)
        ? gateways.items.filter((gw: any) => gw.status === 'online').length
        : 0;

      return this.createTileData(
        config.id,
        config.name,
        'Network',
        onlineGateways === gatewayCount && onlineInterfaces === interfaceCount ? 'online' : 'warning',
        [
          { label: 'Interfaces Up', value: `${onlineInterfaces}/${interfaceCount}`, type: 'text' },
          { label: 'Gateways Online', value: `${onlineGateways}/${gatewayCount}`, type: 'text' },
          { label: 'Status', value: 'Connected', type: 'text' },
        ]
      );
    } catch (error) {
      console.error('OPNsense adapter error:', error);
      return this.createTileData(
        config.id,
        config.name,
        'Network',
        'offline',
        [
          { label: 'Status', value: 'Error', type: 'text' },
          { label: 'Error', value: error instanceof Error ? error.message : 'Unknown error', type: 'text' },
        ]
      );
    }
  }
}
