// Offline-first data hook for all entities
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EntityStore,
  localGet,
  localGetAll,
  localPut,
  localDelete,
  addToSyncQueue,
} from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
  syncEntityFromServer,
} from '@/lib/syncService';

interface UseOfflineDataOptions<T> {
  entity: EntityStore;
  initialFetch?: boolean;
  filter?: (item: T) => boolean;
  orderBy?: keyof T;
  orderDirection?: 'asc' | 'desc';
}

interface UseOfflineDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  isOnline: boolean;
  refetch: () => Promise<void>;
  create: (item: Omit<T, 'id'> & { id?: string }) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Promise<T | undefined>;
}

export function useOfflineData<T extends { id: string; updated_at?: string; created_at?: string }>(
  options: UseOfflineDataOptions<T>
): UseOfflineDataReturn<T> {
  const { entity, initialFetch = true, filter, orderBy, orderDirection = 'desc' } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  // Listen for online status changes
  useEffect(() => {
    return addOnlineStatusListener(setIsOnline);
  }, []);

  // Fetch data from local storage and optionally sync from server
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, get local data
      let localData = await localGetAll<T>(entity);
      
      // Apply filter if provided
      if (filter) {
        localData = localData.filter(filter);
      }
      
      // Apply ordering if provided
      if (orderBy) {
        localData.sort((a, b) => {
          const aVal = a[orderBy];
          const bVal = b[orderBy];
          
          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          const comparison = aVal < bVal ? -1 : 1;
          return orderDirection === 'asc' ? comparison : -comparison;
        });
      }
      
      setData(localData);
      
      // If online, sync from server
      if (isOnline) {
        await syncEntityFromServer<T>(entity);
        
        // Refetch local data after sync
        let updatedData = await localGetAll<T>(entity);
        
        if (filter) {
          updatedData = updatedData.filter(filter);
        }
        
        if (orderBy) {
          updatedData.sort((a, b) => {
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            const comparison = aVal < bVal ? -1 : 1;
            return orderDirection === 'asc' ? comparison : -comparison;
          });
        }
        
        setData(updatedData);
      }
    } catch (err) {
      console.error(`[OfflineData] Error fetching ${entity}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [entity, filter, orderBy, orderDirection, isOnline]);

  // Initial fetch
  useEffect(() => {
    if (initialFetch) {
      fetchData();
    }
  }, [initialFetch, fetchData]);

  // Create a new record
  const create = useCallback(async (item: Omit<T, 'id'> & { id?: string }): Promise<T> => {
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: item.id || crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    } as T;
    
    try {
      // Save locally first
      await localPut(entity, newItem, false);
      
      // Update state
      setData(prev => [newItem, ...prev]);
      
      if (isOnline) {
        // Try to sync immediately
        const cleanItem = { ...newItem } as Record<string, unknown>;
        delete cleanItem._synced;
        delete cleanItem._local_updated_at;
        
        const { error: syncError } = await supabase.from(entity).insert(cleanItem);
        
        if (syncError) {
          console.error(`[OfflineData] Sync error for ${entity}:`, syncError);
          // Add to sync queue for later
          await addToSyncQueue({
            entity,
            operation: 'create',
            data: newItem as unknown as Record<string, unknown>,
            timestamp: now,
          });
        } else {
          // Mark as synced
          await localPut(entity, newItem, true);
        }
      } else {
        // Offline - add to sync queue
        await addToSyncQueue({
          entity,
          operation: 'create',
          data: newItem as unknown as Record<string, unknown>,
          timestamp: now,
        });
      }
      
      return newItem;
    } catch (err) {
      console.error(`[OfflineData] Create error for ${entity}:`, err);
      throw err;
    }
  }, [entity, isOnline]);

  // Update a record
  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    const now = new Date().toISOString();
    
    try {
      // Get current record
      const current = await localGet<T>(entity, id);
      if (!current) return null;
      
      const updatedItem = {
        ...current,
        ...updates,
        updated_at: now,
      } as T;
      
      // Save locally first
      await localPut(entity, updatedItem, false);
      
      // Update state
      setData(prev => prev.map(item => item.id === id ? updatedItem : item));
      
      if (isOnline) {
        // Try to sync immediately
        const cleanItem = { ...updatedItem } as Record<string, unknown>;
        delete cleanItem._synced;
        delete cleanItem._local_updated_at;
        
        const { error: syncError } = await supabase
          .from(entity)
          .update(cleanItem)
          .eq('id', id);
        
        if (syncError) {
          console.error(`[OfflineData] Sync error for ${entity}:`, syncError);
          await addToSyncQueue({
            entity,
            operation: 'update',
            data: updatedItem as unknown as Record<string, unknown>,
            timestamp: now,
          });
        } else {
          await localPut(entity, updatedItem, true);
        }
      } else {
        await addToSyncQueue({
          entity,
          operation: 'update',
          data: updatedItem as unknown as Record<string, unknown>,
          timestamp: now,
        });
      }
      
      return updatedItem;
    } catch (err) {
      console.error(`[OfflineData] Update error for ${entity}:`, err);
      throw err;
    }
  }, [entity, isOnline]);

  // Delete a record
  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      const item = await localGet<T>(entity, id);
      
      // Delete locally
      await localDelete(entity, id);
      
      // Update state
      setData(prev => prev.filter(item => item.id !== id));
      
      if (isOnline) {
        const { error: syncError } = await supabase
          .from(entity)
          .delete()
          .eq('id', id);
        
        if (syncError && syncError.code !== 'PGRST116') {
          console.error(`[OfflineData] Sync error for ${entity}:`, syncError);
          if (item) {
            await addToSyncQueue({
              entity,
              operation: 'delete',
              data: { id } as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } else if (item) {
        await addToSyncQueue({
          entity,
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[OfflineData] Delete error for ${entity}:`, err);
      throw err;
    }
  }, [entity, isOnline]);

  // Get a single record by ID
  const getById = useCallback(async (id: string): Promise<T | undefined> => {
    try {
      let item = await localGet<T>(entity, id);
      
      // If online and not found locally, try to fetch from server
      if (!item && isOnline) {
        const { data: serverData } = await supabase
          .from(entity)
          .select('*')
          .eq('id', id)
          .single();
        
        if (serverData) {
          item = serverData as unknown as T;
          await localPut(entity, item, true);
        }
      }
      
      return item;
    } catch (err) {
      console.error(`[OfflineData] GetById error for ${entity}:`, err);
      return undefined;
    }
  }, [entity, isOnline]);

  return {
    data,
    loading,
    error,
    isOnline,
    refetch: fetchData,
    create,
    update,
    remove,
    getById,
  };
}
