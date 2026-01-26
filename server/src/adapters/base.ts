import type { TileData, IntegrationConfig, AdapterMetadata, ConfigField } from '../../../packages/types/index.js';

export interface Adapter {
  metadata: AdapterMetadata;
  fetchMetrics(config: IntegrationConfig): Promise<TileData>;
  validateConfig(config: Record<string, unknown>): boolean;
}

export abstract class BaseAdapter implements Adapter {
  abstract metadata: AdapterMetadata;

  abstract fetchMetrics(config: IntegrationConfig): Promise<TileData>;

  validateConfig(config: Record<string, unknown>): boolean {
    const schema = this.metadata.configSchema;
    
    for (const [key, field] of Object.entries(schema)) {
      if (field.required && !config[key]) {
        return false;
      }
    }
    
    return true;
  }

  protected createTileData(
    id: string,
    name: string,
    category: string,
    status: 'online' | 'offline' | 'warning' | 'unknown',
    metrics: Array<{ label: string; value: string | number; unit?: string; type?: string }>
  ): TileData {
    return {
      id,
      name,
      category,
      status,
      metrics,
      lastUpdated: new Date(),
    };
  }
}
