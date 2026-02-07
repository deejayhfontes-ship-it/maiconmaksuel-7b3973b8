// IndexedDB wrapper for offline-first storage
const DB_NAME = 'mm-gestao-offline';
const DB_VERSION = 1;

// All entities that support offline-first
export const ENTITY_STORES = [
  'clientes',
  'profissionais',
  'servicos',
  'produtos',
  'agendamentos',
  'atendimentos',
  'atendimento_servicos',
  'atendimento_produtos',
  'pagamentos',
  'caixa',
  'caixa_movimentacoes',
  'vales',
  'gorjetas',
  'dividas',
  'dividas_pagamentos',
  'cheques',
  'registro_ponto',
] as const;

export type EntityStore = typeof ENTITY_STORES[number];

// Sync queue for pending operations
export interface SyncOperation {
  id: string;
  entity: EntityStore;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

let db: IDBDatabase | null = null;

export async function initOfflineDb(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores for each entity
      ENTITY_STORES.forEach((store) => {
        if (!database.objectStoreNames.contains(store)) {
          const objectStore = database.createObjectStore(store, { keyPath: 'id' });
          objectStore.createIndex('updated_at', 'updated_at', { unique: false });
          objectStore.createIndex('_synced', '_synced', { unique: false });
        }
      });

      // Create sync queue store
      if (!database.objectStoreNames.contains('_sync_queue')) {
        const syncStore = database.createObjectStore('_sync_queue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('entity', 'entity', { unique: false });
      }

      // Create metadata store for tracking last sync times
      if (!database.objectStoreNames.contains('_metadata')) {
        database.createObjectStore('_metadata', { keyPath: 'key' });
      }
    };
  });
}

export async function getDb(): Promise<IDBDatabase> {
  if (!db) {
    return initOfflineDb();
  }
  return db;
}

// Generic CRUD operations for local storage
export async function localGet<T>(entity: EntityStore, id: string): Promise<T | undefined> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readonly');
    const store = transaction.objectStore(entity);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function localGetAll<T>(entity: EntityStore): Promise<T[]> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readonly');
    const store = transaction.objectStore(entity);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function localPut<T extends { id: string }>(
  entity: EntityStore, 
  data: T,
  synced: boolean = false
): Promise<T> {
  const database = await getDb();
  const record = { ...data, _synced: synced, _local_updated_at: new Date().toISOString() };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readwrite');
    const store = transaction.objectStore(entity);
    const request = store.put(record);
    
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

export async function localDelete(entity: EntityStore, id: string): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readwrite');
    const store = transaction.objectStore(entity);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function localClear(entity: EntityStore): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readwrite');
    const store = transaction.objectStore(entity);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sync queue operations
export async function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'retries'>): Promise<void> {
  const database = await getDb();
  const syncOp: SyncOperation = {
    ...operation,
    id: crypto.randomUUID(),
    retries: 0,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_sync_queue', 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    const request = store.add(syncOp);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_sync_queue', 'readonly');
    const store = transaction.objectStore('_sync_queue');
    const index = store.index('timestamp');
    const request = index.getAll();
    
    request.onsuccess = () => resolve(request.result as SyncOperation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeSyncOperation(id: string): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_sync_queue', 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateSyncOperation(operation: SyncOperation): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_sync_queue', 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    const request = store.put(operation);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Metadata operations
export async function getMetadata(key: string): Promise<unknown> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_metadata', 'readonly');
    const store = transaction.objectStore('_metadata');
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('_metadata', 'readwrite');
    const store = transaction.objectStore('_metadata');
    const request = store.put({ key, value });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get unsynced records
export async function getUnsyncedRecords<T>(entity: EntityStore): Promise<T[]> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readonly');
    const store = transaction.objectStore(entity);
    const index = store.index('_synced');
    const request = index.getAll(IDBKeyRange.only(false));
    
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// Bulk operations for initial sync
export async function localBulkPut<T extends { id: string }>(
  entity: EntityStore, 
  records: T[]
): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(entity, 'readwrite');
    const store = transaction.objectStore(entity);
    
    records.forEach(record => {
      store.put({ ...record, _synced: true, _local_updated_at: new Date().toISOString() });
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
