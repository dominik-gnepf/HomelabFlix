// Shared types between client and server

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  userId: string;
  name: string;
  adapterId: string;
  category: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  adapterId: string;
  config: Record<string, unknown>;
}

export interface TileData {
  id: string;
  name: string;
  category: string;
  status: 'online' | 'offline' | 'warning' | 'unknown';
  metrics: Metric[];
  lastUpdated: Date;
}

export interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  type?: 'text' | 'number' | 'percentage' | 'bytes' | 'boolean';
}

export interface DashboardData {
  tiles: TileData[];
  categories: {
    name: string;
    tiles: TileData[];
  }[];
}

export interface Settings {
  id: string;
  userId: string;
  refreshRate: number; // in seconds
  theme: 'light' | 'dark' | 'system';
  layout: 'rows' | 'grid';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AdapterMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  configSchema: Record<string, ConfigField>;
  implemented: boolean;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'password' | 'url';
  label: string;
  required: boolean;
  default?: unknown;
  placeholder?: string;
  description?: string;
}
