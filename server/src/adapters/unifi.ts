import axios from 'axios';
import https from 'https';
import type { IntegrationConfig, TileData } from '../../../packages/types/index.js';
import { BaseAdapter } from './base.js';

export class UniFiAdapter extends BaseAdapter {
  metadata = {
    id: 'unifi',
    name: 'UniFi Network',
    category: 'Network',
    description: 'Monitor UniFi network devices and clients',
    configSchema: {
      url: {
        type: 'url' as const,
        label: 'UniFi Controller URL',
        required: true,
        placeholder: 'https://unifi.example.com:8443',
        description: 'Base URL of your UniFi Controller',
      },
      username: {
        type: 'string' as const,
        label: 'Username',
        required: true,
        placeholder: 'admin',
      },
      password: {
        type: 'password' as const,
        label: 'Password',
        required: true,
      },
      site: {
        type: 'string' as const,
        label: 'Site Name',
        required: false,
        default: 'default',
        placeholder: 'default',
      },
      verifySSL: {
        type: 'boolean' as const,
        label: 'Verify SSL',
        required: false,
        default: false,
      },
    },
    implemented: true,
  };

  private async login(baseUrl: string, username: string, password: string, verifySSL: boolean): Promise<string> {
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: verifySSL,
      }),
      withCredentials: true,
    });

    const loginResponse = await axiosInstance.post(
      `${baseUrl}/api/login`,
      {
        username,
        password,
      },
      {
        timeout: 10000,
      }
    );

    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies received from login');
    }

    return cookies.join('; ');
  }

  async fetchMetrics(config: IntegrationConfig): Promise<TileData> {
    try {
      const { url, username, password, site = 'default', verifySSL = false } = config.config as {
        url: string;
        username: string;
        password: string;
        site?: string;
        verifySSL?: boolean;
      };

      const baseUrl = url.replace(/\/$/, '');
      
      // Login to get session cookie
      const cookie = await this.login(baseUrl, username, password, verifySSL);

      const axiosConfig = {
        headers: {
          Cookie: cookie,
        },
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: verifySSL,
        }),
      };

      // Fetch device statistics
      const devicesResponse = await axios.get(
        `${baseUrl}/api/s/${site}/stat/device`,
        axiosConfig
      );

      const devices = devicesResponse.data.data || [];
      
      // Fetch client statistics
      const clientsResponse = await axios.get(
        `${baseUrl}/api/s/${site}/stat/sta`,
        axiosConfig
      );

      const clients = clientsResponse.data.data || [];

      const adoptedDevices = devices.filter((d: any) => d.state === 1).length;
      const connectedClients = clients.length;
      const wirelessClients = clients.filter((c: any) => c.is_wired === false).length;
      const wiredClients = clients.filter((c: any) => c.is_wired === true).length;

      return this.createTileData(
        config.id,
        config.name,
        'Network',
        adoptedDevices === devices.length ? 'online' : 'warning',
        [
          { label: 'Devices', value: `${adoptedDevices}/${devices.length}`, type: 'text' },
          { label: 'Connected Clients', value: connectedClients, type: 'number' },
          { label: 'Wireless', value: wirelessClients, type: 'number' },
          { label: 'Wired', value: wiredClients, type: 'number' },
        ]
      );
    } catch (error) {
      console.error('UniFi adapter error:', error);
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
