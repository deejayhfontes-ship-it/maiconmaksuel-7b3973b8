// Context for offline-first functionality
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initOfflineDb } from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
  startPeriodicSync,
  stopPeriodicSync,
  syncPendingOperations,
  initialSync,
} from '@/lib/syncService';
import { toast } from 'sonner';

interface OfflineContextType {
  isOnline: boolean;
  isInitialized: boolean;
  syncNow: () => Promise<void>;
  pendingChanges: number;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initialize IndexedDB
    initOfflineDb()
      .then(() => {
        console.log('[Offline] IndexedDB inicializado');
        setIsInitialized(true);
        
        // Start initial sync if online
        if (getOnlineStatus()) {
          initialSync();
        }
        
        // Start periodic sync
        startPeriodicSync(30000); // Every 30 seconds
      })
      .catch((error) => {
        console.error('[Offline] Erro ao inicializar IndexedDB:', error);
        // Even if IndexedDB fails, the app should work online-only
        setIsInitialized(true);
      });

    // Listen for online status changes
    const unsubscribe = addOnlineStatusListener((online) => {
      setIsOnline(online);
      
      if (online && wasOffline) {
        toast.success('Conexão restabelecida! Sincronizando dados...', {
          duration: 3000,
        });
        syncPendingOperations();
      } else if (!online) {
        setWasOffline(true);
        toast.warning('Você está offline. As alterações serão salvas localmente.', {
          duration: 3000,
        });
      }
    });

    // Check for pending changes periodically
    const checkPending = setInterval(async () => {
      try {
        const { getSyncQueue } = await import('@/lib/offlineDb');
        const queue = await getSyncQueue();
        setPendingChanges(queue.length);
      } catch {
        // Ignore errors
      }
    }, 5000);

    return () => {
      unsubscribe();
      stopPeriodicSync();
      clearInterval(checkPending);
    };
  }, [wasOffline]);

  const syncNow = async () => {
    if (isOnline) {
      await syncPendingOperations();
      toast.success('Sincronização concluída!');
    } else {
      toast.error('Sem conexão. Não é possível sincronizar agora.');
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isInitialized,
        syncNow,
        pendingChanges,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
