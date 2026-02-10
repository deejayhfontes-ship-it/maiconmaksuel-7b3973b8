// Sync service for offline-first data synchronization
import { supabase } from '@/integrations/supabase/client';
import {
  EntityStore,
  SYNCABLE_ENTITY_STORES,
  getSyncQueue,
  removeSyncOperation,
  updateSyncOperation,
  localPut,
  localBulkPut,
  getMetadata,
  setMetadata,
  SyncOperation,
} from './offlineDb';
import { toast } from 'sonner';

// Online status tracking
let isOnline = navigator.onLine;
let syncInProgress = false;
const syncListeners = new Set<(online: boolean) => void>();

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function addOnlineStatusListener(listener: (online: boolean) => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

function notifyListeners() {
  syncListeners.forEach(listener => listener(isOnline));
}

// Initialize online status listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners();
    console.log('[Sync] Online - iniciando sincronização...');
    syncPendingOperations();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners();
    console.log('[Sync] Offline - operações serão salvas localmente');
  });
}

// Conflict resolution by latest timestamp
function resolveConflict<T extends { updated_at?: string }>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updated_at || 0).getTime();
  const remoteTime = new Date(remote.updated_at || 0).getTime();
  
  // Remote wins if it has a later timestamp
  if (remoteTime > localTime) {
    return remote;
  }
  return local;
}

// Sync a single operation to Supabase
async function syncOperation(operation: SyncOperation): Promise<boolean> {
  const { entity, operation: op, data } = operation;
  const dataId = data.id as string;
  
  try {
    // Remove internal fields before syncing
    const cleanData = { ...data };
    delete cleanData._synced;
    delete cleanData._local_updated_at;
    
    switch (op) {
      case 'create': {
        const { error } = await supabase.from(entity).insert(cleanData);
        if (error) {
          // Check if it's a duplicate key error - if so, try update instead
          if (error.code === '23505') {
            const { error: updateError } = await supabase
              .from(entity)
              .update(cleanData)
              .eq('id', dataId);
            if (updateError) throw updateError;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'update': {
        // First fetch the remote version
        const { data: remote } = await supabase
          .from(entity)
          .select('*')
          .eq('id', dataId)
          .single();
        
        // Resolve conflict if remote exists
        if (remote && 'updated_at' in remote) {
          const localWithTimestamp = data as { updated_at?: string };
          const remoteWithTimestamp = remote as { updated_at?: string };
          const resolved = resolveConflict(localWithTimestamp, remoteWithTimestamp);
          if (resolved === remoteWithTimestamp) {
            // Remote wins, update local
            await localPut(entity, { ...remote, id: (remote as { id: string }).id }, true);
            return true;
          }
        }
        
        const { error } = await supabase
          .from(entity)
          .update(cleanData)
          .eq('id', dataId);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await supabase
          .from(entity)
          .delete()
          .eq('id', dataId);
        if (error && error.code !== 'PGRST116') throw error; // Ignore "not found"
        break;
      }
    }
    
    // Mark local record as synced
    if (op !== 'delete') {
      await localPut(entity, { ...data, id: dataId }, true);
    }
    
    return true;
  } catch (error) {
    console.error(`[Sync] Erro ao sincronizar ${entity}:`, error);
    return false;
  }
}

// Sync all pending operations
export async function syncPendingOperations(): Promise<void> {
  if (!isOnline || syncInProgress) return;
  
  syncInProgress = true;
  
  try {
    let queue: SyncOperation[];
    try {
      queue = await getSyncQueue();
    } catch (dbError) {
      // Handle IndexedDB connection closed error gracefully
      console.warn('[Sync] IndexedDB não disponível, pulando sincronização:', dbError);
      syncInProgress = false;
      return;
    }
    
    if (queue.length === 0) {
      syncInProgress = false;
      return;
    }
    
    console.log(`[Sync] Sincronizando ${queue.length} operações pendentes...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const operation of queue) {
      const success = await syncOperation(operation);
      
      if (success) {
        try {
          await removeSyncOperation(operation.id);
        } catch {
          // Ignore remove errors
        }
        successCount++;
      } else {
        // Increment retry count
        operation.retries++;
        
        if (operation.retries >= 5) {
          // Max retries reached, remove from queue and log error
          console.error(`[Sync] Operação falhou após 5 tentativas:`, operation);
          try {
            await removeSyncOperation(operation.id);
          } catch {
            // Ignore remove errors
          }
          failCount++;
        } else {
          try {
            await updateSyncOperation(operation);
          } catch {
            // Ignore update errors
          }
        }
      }
    }
    
    if (successCount > 0) {
      console.log(`[Sync] ${successCount} operações sincronizadas com sucesso`);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} operação(ões) falharam na sincronização`);
    }
  } catch (error) {
    console.error('[Sync] Erro durante sincronização:', error);
  } finally {
    syncInProgress = false;
  }
}

// Fetch data from Supabase and update local storage
export async function syncEntityFromServer<T extends { id: string }>(
  entity: EntityStore,
  query?: (builder: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>
): Promise<T[]> {
  if (!isOnline) {
    console.log(`[Sync] Offline - usando dados locais para ${entity}`);
    return [];
  }
  
  try {
    const lastSync = await getMetadata(`lastSync_${entity}`) as string | undefined;
    
    let queryBuilder = supabase.from(entity).select('*');
    
    // Apply custom query if provided
    if (query) {
      queryBuilder = query(supabase.from(entity)) as typeof queryBuilder;
    } else if (lastSync) {
      // Only fetch updated records since last sync
      queryBuilder = queryBuilder.gte('updated_at', lastSync);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Merge with local data, resolving conflicts
      await localBulkPut(entity, data as unknown as T[]);
    }
    
    // Update last sync time
    await setMetadata(`lastSync_${entity}`, new Date().toISOString());
    
    return (data as unknown as T[]) || [];
  } catch (error) {
    console.error(`[Sync] Erro ao sincronizar ${entity} do servidor:`, error);
    return [];
  }
}

// Initial sync for all entities
export async function initialSync(): Promise<void> {
  if (!isOnline) return;
  
  console.log('[Sync] Iniciando sincronização inicial...');
  
  try {
    for (const entity of SYNCABLE_ENTITY_STORES) {
      await syncEntityFromServer(entity);
    }
    
    console.log('[Sync] Sincronização inicial concluída');
  } catch (error) {
    console.error('[Sync] Erro na sincronização inicial:', error);
  }
}

// Schedule periodic sync
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicSync(intervalMs: number = 30000): void {
  if (syncInterval) return;
  
  syncInterval = setInterval(() => {
    if (isOnline) {
      syncPendingOperations();
    }
  }, intervalMs);
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
