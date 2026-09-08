// 1Cell.Ai Content Hub - Cloud Sync Configuration
// Configures shared real-time database connectivity (Supabase)

export const DEFAULT_CLOUD_CONFIG = {
  supabaseUrl: '', // e.g. 'https://[project-ref].supabase.co'
  supabaseAnonKey: '', // e.g. 'eyJhbGciOi...'
  tableName: 'content_hub_assets',
  realtimeEnabled: true,
  autoSyncIntervalMs: 45000
};

/**
 * Retrieve the active cloud configuration from localStorage or defaults.
 */
export function getActiveCloudConfig() {
  try {
    const stored = localStorage.getItem('1cell_cloud_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CLOUD_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse local cloud config:', e);
  }
  return { ...DEFAULT_CLOUD_CONFIG };
}

/**
 * Persist updated cloud configuration to localStorage.
 */
export function saveActiveCloudConfig(config) {
  try {
    const merged = { ...getActiveCloudConfig(), ...config };
    localStorage.setItem('1cell_cloud_config', JSON.stringify(merged));
    return true;
  } catch (e) {
    console.error('Failed to save cloud config:', e);
    return false;
  }
}

/**
 * Check if the active configuration has non-empty credentials.
 */
export function isCloudConfigured() {
  const cfg = getActiveCloudConfig();
  return Boolean(cfg.supabaseUrl && cfg.supabaseUrl.trim() && cfg.supabaseAnonKey && cfg.supabaseAnonKey.trim());
}
