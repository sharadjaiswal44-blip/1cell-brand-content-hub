// ============================================================================
// 1Cell.Ai Content Hub - Centralized Supabase Database Service
// ============================================================================
import { getActiveSupabaseConfig, isSupabaseConfigured } from './supabase-config.js';

// CDN URL for Supabase JS Client v2 (ES Module)
const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

class SupabaseService {
  constructor() {
    this.client = null;
    this.realtimeChannel = null;
    this.initializationPromise = null;
    this.cachedAssets = [];
    this.listeners = [];
  }

  /**
   * Dynamically loads and returns the Supabase client instance.
   */
  async getClient() {
    if (this.client) return this.client;
    if (!isSupabaseConfigured()) return null;

    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        const config = getActiveSupabaseConfig();
        let createClientFn = window.supabase?.createClient;

        if (!createClientFn) {
          const mod = await import(SUPABASE_CDN_URL);
          createClientFn = mod.createClient;
        }

        if (!createClientFn) {
          throw new Error('Supabase client library could not be loaded.');
        }

        this.client = createClientFn(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });

        return this.client;
      } catch (err) {
        console.error('[SupabaseService] Client initialization failed:', err);
        this.client = null;
        return null;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Validates that the provided URL is a legitimate OneDrive/SharePoint or M365 document link.
   */
  validateDocumentUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, message: 'Document URL is required.' };
    }

    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, message: 'URL must begin with https:// or http://' };
    }

    const lower = trimmed.toLowerCase();
    const isM365 = lower.includes('sharepoint.com') ||
                  lower.includes('onedrive.live.com') ||
                  lower.includes('1drv.ms') ||
                  lower.includes('office.com') ||
                  lower.includes('microsoft.com') ||
                  lower.includes('1cell.ai');

    // Allow other valid corporate URLs while encouraging M365/OneDrive
    if (!isM365) {
      // Soft validation - allows if it's a valid URL format
      try {
        new URL(trimmed);
      } catch (e) {
        return { valid: false, message: 'Please provide a valid document URL.' };
      }
    }

    return { valid: true, url: trimmed };
  }

  /**
   * Checks if an identical OneDrive/SharePoint document URL is already registered in active assets.
   */
  async checkDuplicateUrl(url, excludeId = null) {
    const trimmed = (url || '').trim().toLowerCase();
    if (!trimmed) return null;

    // 1. Check in-memory cached assets first
    const localMatch = this.cachedAssets.find(a => 
      !a.is_deleted && 
      a.id !== excludeId && 
      (a.sharepoint_url || '').trim().toLowerCase() === trimmed
    );
    if (localMatch) return localMatch;

    // 2. Check directly in Supabase if client is connected
    const client = await this.getClient();
    if (client) {
      try {
        let query = client
          .from('content_assets')
          .select('id, title, sharepoint_url')
          .eq('is_deleted', false)
          .ilike('sharepoint_url', trimmed);

        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          return data[0];
        }
      } catch (e) {
        console.warn('[SupabaseService] Duplicate check error:', e);
      }
    }

    return null;
  }

  /**
   * Fetches all active (non-deleted) Content Hub cards from Supabase.
   */
  async fetchActiveAssets() {
    const client = await this.getClient();
    if (!client) {
      return { success: false, configured: false, data: [] };
    }

    try {
      const { data, error } = await client
        .from('content_assets')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseService] fetchActiveAssets query error:', error);
        return { success: false, configured: true, error: error.message, data: [] };
      }

      this.cachedAssets = data || [];
      return { success: true, configured: true, data: this.cachedAssets };
    } catch (err) {
      console.error('[SupabaseService] fetchActiveAssets exception:', err);
      return { success: false, configured: true, error: err.message, data: [] };
    }
  }

  /**
   * Inserts a new Content Hub card record into Supabase.
   */
  async createAsset(assetInput) {
    // 1. Validate Document URL
    const urlCheck = this.validateDocumentUrl(assetInput.sharepoint_url);
    if (!urlCheck.valid) {
      throw new Error(urlCheck.message);
    }

    // 2. Check for Duplicate Document URL
    const duplicate = await this.checkDuplicateUrl(urlCheck.url);
    if (duplicate) {
      throw new Error(`This SharePoint/OneDrive document is already registered in the Content Hub under "${duplicate.title}".`);
    }

    const client = await this.getClient();
    if (!client) {
      throw new Error('Central cloud database is not configured. Please connect Supabase in configuration.');
    }

    const nowIso = new Date().toISOString();
    const record = {
      id: assetInput.id || `asset-${Date.now()}`,
      title: (assetInput.title || '').trim(),
      description: (assetInput.description || '').trim(),
      category: assetInput.category || 'product-collateral',
      department: assetInput.department || 'Marketing',
      product_workspace: assetInput.product_workspace || null,
      content_type: assetInput.content_type || 'Brochure',
      region: assetInput.region || 'Global',
      cancer_type: assetInput.cancer_type || 'None',
      biomarkers: assetInput.biomarkers || 'None',
      owner_author: assetInput.owner_author || '1Cell.Ai',
      version: assetInput.version || 'v1.0',
      status: assetInput.status || 'Approved',
      target_team: (assetInput.target_team || 'marketing').toLowerCase(),
      collaboration_scope: (assetInput.collaboration_scope || 'all').toLowerCase(),
      sharepoint_url: urlCheck.url,
      sharepoint_folder_path: assetInput.sharepoint_folder_path || 'Shared Documents',
      created_by: assetInput.created_by || 'Team Member',
      created_by_email: assetInput.created_by_email || 'team@1cell.ai',
      created_at: assetInput.created_at || nowIso,
      updated_at: nowIso,
      is_deleted: false,
      extra_metadata: assetInput.extra_metadata || {}
    };

    if (!record.title) {
      throw new Error('Title is required to create a content card.');
    }

    const { data, error } = await client
      .from('content_assets')
      .insert([record])
      .select();

    if (error) {
      console.error('[SupabaseService] Insert error:', error);
      throw new Error(`Database error saving card: ${error.message}`);
    }

    const created = (data && data[0]) ? data[0] : record;
    // Update local cache
    this.cachedAssets.unshift(created);
    return created;
  }

  /**
   * Updates an existing Content Hub card record in Supabase.
   */
  async updateAsset(id, updatedFields) {
    if (!id) throw new Error('Asset ID is required for updating.');

    // If updating SharePoint URL, validate format
    if (updatedFields.sharepoint_url) {
      const urlCheck = this.validateDocumentUrl(updatedFields.sharepoint_url);
      if (!urlCheck.valid) {
        throw new Error(urlCheck.message);
      }
      updatedFields.sharepoint_url = urlCheck.url;
    }

    const client = await this.getClient();
    if (!client) {
      throw new Error('Central cloud database is not configured.');
    }

    const updatePayload = {
      ...updatedFields,
      updated_at: new Date().toISOString()
    };

    // Remove immutable fields if present
    delete updatePayload.id;
    delete updatePayload.created_at;

    const { data, error } = await client
      .from('content_assets')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[SupabaseService] Update error:', error);
      throw new Error(`Database error updating card: ${error.message}`);
    }

    const updated = (data && data[0]) ? data[0] : { id, ...updatePayload };
    // Update local cache
    const idx = this.cachedAssets.findIndex(a => a.id === id);
    if (idx >= 0) {
      this.cachedAssets[idx] = { ...this.cachedAssets[idx], ...updated };
    }

    return updated;
  }

  /**
   * Soft-deletes a Content Hub card record in Supabase.
   * NEVER deletes the actual document in OneDrive/SharePoint.
   */
  async deleteAsset(id) {
    if (!id) throw new Error('Asset ID is required for deletion.');

    const client = await this.getClient();
    if (!client) {
      throw new Error('Central cloud database is not configured.');
    }

    const nowIso = new Date().toISOString();
    const { error } = await client
      .from('content_assets')
      .update({ is_deleted: true, updated_at: nowIso })
      .eq('id', id);

    if (error) {
      console.error('[SupabaseService] Delete error:', error);
      throw new Error(`Database error removing card: ${error.message}`);
    }

    // Remove from local cache
    this.cachedAssets = this.cachedAssets.filter(a => a.id !== id);
    return true;
  }

  /**
   * Subscribes to real-time database changes on `content_assets` table.
   */
  async subscribeToRealtime(onRealtimeEvent) {
    const client = await this.getClient();
    if (!client) return false;

    try {
      if (this.realtimeChannel) {
        client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = client
        .channel('content_assets_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'content_assets' },
          (payload) => {
            console.log('[Supabase Realtime Event]', payload.eventType, payload);

            if (payload.eventType === 'INSERT') {
              const item = payload.new;
              if (item && !item.is_deleted) {
                // Prepend to cached assets if not already there
                if (!this.cachedAssets.some(a => a.id === item.id)) {
                  this.cachedAssets.unshift(item);
                }
                if (typeof onRealtimeEvent === 'function') {
                  onRealtimeEvent({ type: 'INSERT', item });
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const item = payload.new;
              if (item) {
                if (item.is_deleted) {
                  // Soft deleted
                  this.cachedAssets = this.cachedAssets.filter(a => a.id !== item.id);
                  if (typeof onRealtimeEvent === 'function') {
                    onRealtimeEvent({ type: 'DELETE', id: item.id });
                  }
                } else {
                  // Metadata updated
                  const idx = this.cachedAssets.findIndex(a => a.id === item.id);
                  if (idx >= 0) {
                    this.cachedAssets[idx] = item;
                  } else {
                    this.cachedAssets.unshift(item);
                  }
                  if (typeof onRealtimeEvent === 'function') {
                    onRealtimeEvent({ type: 'UPDATE', item });
                  }
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old ? payload.old.id : null;
              if (oldId) {
                this.cachedAssets = this.cachedAssets.filter(a => a.id !== oldId);
                if (typeof onRealtimeEvent === 'function') {
                  onRealtimeEvent({ type: 'DELETE', id: oldId });
                }
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime Status]:', status);
        });

      return true;
    } catch (e) {
      console.warn('[SupabaseService] Realtime subscription error:', e);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
