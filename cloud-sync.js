// 1Cell.Ai Content Hub - Real-Time Cloud Synchronization Engine
// Integrates with Supabase to provide seamless team-wide document and asset collaboration.

import { getActiveCloudConfig, isCloudConfigured } from './cloud-config.js';

class CloudSyncService {
  constructor() {
    this.client = null;
    this.status = 'unconfigured'; // 'unconfigured' | 'connecting' | 'connected' | 'syncing' | 'error'
    this.lastSyncedAt = null;
    this.remoteCount = 0;
    this.lastError = null;
    this.subscribers = new Set();
    this.realtimeChannel = null;
    this.dbRef = null;
    this.onRemoteUpdateCallback = null;
  }

  /**
   * Subscribe to status and sync updates.
   */
  subscribe(fn) {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => this.subscribers.delete(fn);
  }

  notify() {
    const state = this.getState();
    this.subscribers.forEach(fn => {
      try { fn(state); } catch (e) { console.error('CloudSync subscriber error:', e); }
    });
  }

  getState() {
    return {
      status: this.status,
      isConfigured: isCloudConfigured(),
      lastSyncedAt: this.lastSyncedAt,
      remoteCount: this.remoteCount,
      lastError: this.lastError
    };
  }

  /**
   * Initialize Supabase client and establish real-time connection.
   */
  async init(db, onRemoteUpdate) {
    this.dbRef = db;
    this.onRemoteUpdateCallback = onRemoteUpdate;

    if (!isCloudConfigured()) {
      this.status = 'unconfigured';
      this.notify();
      return false;
    }

    const config = getActiveCloudConfig();
    this.status = 'connecting';
    this.notify();

    try {
      // Dynamic import of official Supabase JS SDK via CDN
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      
      this.client = createClient(config.supabaseUrl.trim(), config.supabaseAnonKey.trim(), {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // Initial fetch and merge
      await this.fetchAndApplyRemoteAssets();

      // Setup Realtime WebSocket Listener
      if (config.realtimeEnabled) {
        this.setupRealtime(config.tableName);
      }

      this.status = 'connected';
      this.notify();
      return true;
    } catch (err) {
      console.warn('[CloudSync] Connection failed, operating in offline/local mode:', err);
      this.status = 'error';
      this.lastError = err.message || 'Connection failed';
      this.notify();
      return false;
    }
  }

  /**
   * Setup Supabase Realtime channel to listen for team-wide changes
   */
  setupRealtime(tableName) {
    if (!this.client) return;

    try {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = this.client
        .channel('content_hub_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          console.log('[CloudSync] Realtime change received:', payload);
          this.handleIncomingRealtimePayload(payload);
        })
        .subscribe((subStatus) => {
          console.log(`[CloudSync] Channel status: ${subStatus}`);
          if (subStatus === 'SUBSCRIBED') {
            this.status = 'connected';
            this.notify();
          }
        });
    } catch (err) {
      console.warn('[CloudSync] Realtime subscription error:', err);
    }
  }

  /**
   * Fetch all records from the cloud table and merge into in-memory db & local cache.
   */
  async fetchAndApplyRemoteAssets() {
    if (!this.client || !this.dbRef) return;

    const config = getActiveCloudConfig();
    this.status = 'syncing';
    this.notify();

    try {
      const { data, error } = await this.client
        .from(config.tableName)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (Array.isArray(data)) {
        this.remoteCount = data.length;
        let appliedCount = 0;

        // Process deletions first
        const deletedRecords = data.filter(r => r.collection === 'deleted');
        const deletedIds = new Set(deletedRecords.map(r => r.id));

        // Save deleted IDs to local storage cache
        try {
          const localDeleted = JSON.parse(localStorage.getItem('1cell_deleted_asset_ids') || '[]');
          const combinedDeleted = Array.from(new Set([...localDeleted, ...deletedIds]));
          localStorage.setItem('1cell_deleted_asset_ids', JSON.stringify(combinedDeleted));
        } catch (e) {}

        // Apply records to matching db collections
        data.forEach(record => {
          if (record.collection === 'deleted') {
            this.removeItemFromDb(record.id);
            return;
          }

          if (!deletedIds.has(record.id) && record.data) {
            this.upsertItemToDb(record.collection, record.data);
            appliedCount++;
          }
        });

        this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.status = 'connected';
        this.lastError = null;
        this.notify();

        if (this.onRemoteUpdateCallback && appliedCount > 0) {
          this.onRemoteUpdateCallback({ type: 'INITIAL_SYNC', count: appliedCount });
        }
      }
    } catch (err) {
      console.warn('[CloudSync] Fetch failed:', err);
      this.status = 'error';
      this.lastError = err.message || 'Failed to fetch assets';
      this.notify();
    }
  }

  /**
   * Handle incoming WebSocket message when a teammate adds, modifies, or deletes an asset.
   */
  handleIncomingRealtimePayload(payload) {
    if (!this.dbRef || !payload) return;

    const { eventType, new: newRecord, old: oldRecord } = payload;
    let notifyMessage = null;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (newRecord.collection === 'deleted') {
        this.removeItemFromDb(newRecord.id);
        notifyMessage = `Asset removed by team member`;
      } else if (newRecord.data) {
        this.upsertItemToDb(newRecord.collection, newRecord.data);
        notifyMessage = `New asset synced: "${newRecord.data.title || 'Document'}"`;
      }
    } else if (eventType === 'DELETE') {
      if (oldRecord && oldRecord.id) {
        this.removeItemFromDb(oldRecord.id);
        notifyMessage = `Asset deleted by team member`;
      }
    }

    this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.notify();

    if (this.onRemoteUpdateCallback) {
      this.onRemoteUpdateCallback({ type: 'REALTIME_EVENT', eventType, record: newRecord || oldRecord, message: notifyMessage });
    }
  }

  /**
   * Push a newly created asset to the cloud database.
   */
  async syncAddAsset(collection, item, author) {
    // Always persist to local cache first
    this.upsertItemToDb(collection, item);

    if (!this.client) {
      console.log('[CloudSync] Offline / Unconfigured - asset saved locally only');
      return { success: false, offline: true };
    }

    const config = getActiveCloudConfig();
    try {
      const row = {
        id: item.id,
        collection: collection,
        data: item,
        created_by: author || item.owner || item.author || '1Cell.Ai User',
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client.from(config.tableName).upsert(row);
      if (error) throw error;

      this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.notify();
      return { success: true };
    } catch (err) {
      console.error('[CloudSync] syncAddAsset error:', err);
      this.lastError = err.message;
      this.notify();
      return { success: false, error: err };
    }
  }

  /**
   * Push an updated asset to the cloud database.
   */
  async syncUpdateAsset(collection, item) {
    this.upsertItemToDb(collection, item);

    if (!this.client) return { success: false, offline: true };

    const config = getActiveCloudConfig();
    try {
      const row = {
        id: item.id,
        collection: collection,
        data: item,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client.from(config.tableName).upsert(row);
      if (error) throw error;

      this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.notify();
      return { success: true };
    } catch (err) {
      console.error('[CloudSync] syncUpdateAsset error:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Remove an asset from the cloud database and broadcast deletion.
   */
  async syncDeleteAsset(collection, id) {
    this.removeItemFromDb(id);

    if (!this.client) return { success: false, offline: true };

    const config = getActiveCloudConfig();
    try {
      // Upsert a deletion tombstone so all connected clients remove it from storage
      await this.client.from(config.tableName).upsert({
        id: id,
        collection: 'deleted',
        data: { id, deletedAt: new Date().toISOString() },
        updated_at: new Date().toISOString()
      });

      this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.notify();
      return { success: true };
    } catch (err) {
      console.error('[CloudSync] syncDeleteAsset error:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Helpers to merge and clean collections in memory and localStorage
   */
  upsertItemToDb(collection, item) {
    if (!this.dbRef || !item || !item.id) return;

    let targetArray = null;
    let storageKey = null;

    switch (collection) {
      case 'documents':
      case 'document':
        targetArray = this.dbRef.documents;
        storageKey = '1cell_custom_documents';
        break;
      case 'cases':
      case 'case':
        targetArray = this.dbRef.cases;
        storageKey = '1cell_custom_cases';
        break;
      case 'publications':
      case 'publication':
        targetArray = this.dbRef.publications;
        storageKey = '1cell_custom_pubs';
        break;
      case 'videos':
      case 'video':
        targetArray = this.dbRef.videos;
        storageKey = '1cell_custom_videos';
        break;
      case 'reports':
      case 'report':
        if (!this.dbRef.reports) this.dbRef.reports = [];
        targetArray = this.dbRef.reports;
        storageKey = '1cell_custom_reports';
        break;
      case 'brand-assets':
      case 'brandAssets':
        targetArray = this.dbRef.brandAssets;
        storageKey = '1cell_custom_brandAssets';
        break;
      case 'templates':
        targetArray = this.dbRef.templates;
        storageKey = '1cell_custom_templates';
        break;
    }

    if (!targetArray) return;

    const idx = targetArray.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      targetArray[idx] = { ...targetArray[idx], ...item };
    } else {
      targetArray.unshift(item);
    }

    // Persist custom records to localStorage cache
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(targetArray));
      } catch (e) {}
    }
  }

  removeItemFromDb(id) {
    if (!this.dbRef || !id) return;

    ['documents', 'cases', 'publications', 'videos', 'reports', 'brandAssets', 'templates'].forEach(col => {
      const arr = this.dbRef[col];
      if (Array.isArray(arr)) {
        const idx = arr.findIndex(x => x.id === id);
        if (idx >= 0) {
          arr.splice(idx, 1);
        }
      }
    });

    // Update local storage deleted IDs
    try {
      const deletedIds = JSON.parse(localStorage.getItem('1cell_deleted_asset_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('1cell_deleted_asset_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}
  }

  /**
   * Built-in Export Tool: Gathers all custom added/modified assets as a JSON bundle.
   */
  exportCustomData() {
    const bundle = {
      app: '1Cell.Ai Content Hub',
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      documents: JSON.parse(localStorage.getItem('1cell_custom_documents') || '[]'),
      cases: JSON.parse(localStorage.getItem('1cell_custom_cases') || '[]'),
      publications: JSON.parse(localStorage.getItem('1cell_custom_pubs') || '[]'),
      videos: JSON.parse(localStorage.getItem('1cell_custom_videos') || '[]'),
      reports: JSON.parse(localStorage.getItem('1cell_custom_reports') || '[]'),
      brandAssets: JSON.parse(localStorage.getItem('1cell_custom_brandAssets') || '[]'),
      templates: JSON.parse(localStorage.getItem('1cell_custom_templates') || '[]')
    };

    // Calculate non-default assets (e.g. newly created docs with doc-, case-, brand- timestamp IDs)
    const customDocs = bundle.documents.filter(d => d.id && (d.id.startsWith('doc-') || d.id.startsWith('custom-')));
    bundle.customDocumentsCount = customDocs.length;
    return bundle;
  }

  /**
   * Built-in Import Tool: Takes a JSON string or object, merges it into the current workspace,
   * and if Supabase is connected, synchronizes it directly to the cloud.
   */
  async importCustomData(jsonStringOrObj) {
    try {
      const data = typeof jsonStringOrObj === 'string' ? JSON.parse(jsonStringOrObj) : jsonStringOrObj;
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON payload');

      let importedCount = 0;

      const collections = [
        { key: 'documents', type: 'documents' },
        { key: 'cases', type: 'cases' },
        { key: 'publications', type: 'publications' },
        { key: 'videos', type: 'videos' },
        { key: 'reports', type: 'reports' },
        { key: 'brandAssets', type: 'brandAssets' },
        { key: 'templates', type: 'templates' }
      ];

      for (const col of collections) {
        if (Array.isArray(data[col.key])) {
          for (const item of data[col.key]) {
            if (item && item.id) {
              this.upsertItemToDb(col.type, item);
              importedCount++;
              // If cloud is connected, push this item so the entire team receives it!
              if (this.client) {
                try {
                  await this.syncAddAsset(col.type, item);
                } catch (e) {}
              }
            }
          }
        }
      }

      if (this.onRemoteUpdateCallback) {
        this.onRemoteUpdateCallback({ type: 'IMPORT_COMPLETE', count: importedCount });
      }

      return { success: true, count: importedCount };
    } catch (err) {
      console.error('[CloudSync] importCustomData failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export const cloudSync = new CloudSyncService();
