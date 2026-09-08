// ============================================================================
// 1Cell.Ai Content Hub - Supabase Centralized Database Configuration
// ============================================================================
// IMPORTANT SECURITY NOTICE:
// Only use the Supabase Project URL and Public 'anon' Key here.
// NEVER put a 'service_role' key or database admin secret in this file or any
// client-side code on GitHub Pages!

export const DEFAULT_SUPABASE_CONFIG = {
  // Enter your Supabase Project URL, e.g. "https://abcdefghijklmnopqrst.supabase.co"
  supabaseUrl: '',

  // Enter your Supabase Public 'anon' Key (starts with "eyJhbGciOi...")
  supabaseAnonKey: '',

  // Primary database table for Content Hub cards
  tableName: 'content_assets',

  // Enable Supabase Realtime subscriptions
  realtimeEnabled: true
};

/**
 * Retrieves the currently active Supabase configuration.
 * Order of precedence:
 * 1. window.__1CELL_CONFIG__ (runtime injection / build script)
 * 2. localStorage ('1cell_supabase_config') (configured via in-app dialog)
 * 3. DEFAULT_SUPABASE_CONFIG (hardcoded in this file)
 */
export function getActiveSupabaseConfig() {
  let config = { ...DEFAULT_SUPABASE_CONFIG };

  // 1. Check window.__1CELL_CONFIG__
  if (typeof window !== 'undefined' && window.__1CELL_CONFIG__) {
    config = { ...config, ...window.__1CELL_CONFIG__ };
  }

  // 2. Check localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('1cell_supabase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
          config = { ...config, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored Supabase config:', e);
    }
  }

  return config;
}

/**
 * Persists Supabase configuration to localStorage.
 */
export function saveActiveSupabaseConfig(newConfig) {
  try {
    const current = getActiveSupabaseConfig();
    const merged = { ...current, ...newConfig };
    localStorage.setItem('1cell_supabase_config', JSON.stringify({
      supabaseUrl: merged.supabaseUrl.trim(),
      supabaseAnonKey: merged.supabaseAnonKey.trim()
    }));
    return true;
  } catch (e) {
    console.error('Failed to save Supabase config:', e);
    return false;
  }
}

/**
 * Checks if Supabase connection details are present and valid.
 */
export function isSupabaseConfigured() {
  const config = getActiveSupabaseConfig();
  return Boolean(
    config.supabaseUrl && 
    config.supabaseUrl.startsWith('http') && 
    config.supabaseAnonKey &&
    config.supabaseAnonKey.length > 20
  );
}

/**
 * Clears stored configuration.
 */
export function clearSupabaseConfig() {
  try {
    localStorage.removeItem('1cell_supabase_config');
    return true;
  } catch (e) {
    return false;
  }
}
