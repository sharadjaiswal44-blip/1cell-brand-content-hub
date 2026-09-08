// 1Cell.Ai Content Hub - Multi-Team Real-Time Cloud & Local Synchronization Configuration
// Configures shared real-time database connectivity (Supabase) + browser BroadcastChannel

export const TEAMS = {
  MARKETING: 'marketing',
  SCIENTIFIC: 'scientific',
  SALES: 'sales',
  LEADERSHIP: 'leadership'
};

export const VISIBILITY = {
  ALL: 'all',             // Cross-Team: Visible to Marketing & Scientific (+ Leadership & Sales)
  MARKETING: 'marketing', // Marketing Team Only
  SCIENTIFIC: 'scientific' // Scientific Team Only
};

export const BROADCAST_CHANNEL_NAME = '1cell_realtime_collaboration';

export const DEFAULT_CLOUD_CONFIG = {
  supabaseUrl: '', // e.g. 'https://[project-ref].supabase.co'
  supabaseAnonKey: '', // e.g. 'eyJhbGciOi...'
  tableName: 'content_hub_assets',
  realtimeEnabled: true,
  broadcastEnabled: true,
  autoSyncIntervalMs: 45000
};

/**
 * Normalizes any department or role string into a canonical team identifier.
 */
export function normalizeTeam(deptOrRole) {
  if (!deptOrRole) return TEAMS.MARKETING;
  const str = deptOrRole.toString().toLowerCase().trim();
  if (str.includes('scien') || str.includes('genomic') || str.includes('medical') || str === 'doctor') {
    return TEAMS.SCIENTIFIC;
  }
  if (str.includes('market') || str.includes('brand')) {
    return TEAMS.MARKETING;
  }
  if (str.includes('sale') || str.includes('rep')) {
    return TEAMS.SALES;
  }
  if (str.includes('leader') || str.includes('exec') || str.includes('admin')) {
    return TEAMS.LEADERSHIP;
  }
  return TEAMS.MARKETING;
}

/**
 * Checks whether a given team is permitted to view a card with specific visibility.
 */
export function canTeamViewVisibility(userTeam, cardVisibility) {
  const normTeam = normalizeTeam(userTeam);
  const normVis = (cardVisibility || VISIBILITY.ALL).toLowerCase();

  // Leadership can inspect all content
  if (normTeam === TEAMS.LEADERSHIP) return true;

  // Cross-team content is open to all
  if (normVis === VISIBILITY.ALL || normVis === 'cross-team' || normVis === 'both') return true;

  // Exact team match
  if (normVis === normTeam) return true;

  // Sales team can view marketing and cross-team
  if (normTeam === TEAMS.SALES && (normVis === VISIBILITY.MARKETING || normVis === VISIBILITY.ALL)) return true;

  return false;
}

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
