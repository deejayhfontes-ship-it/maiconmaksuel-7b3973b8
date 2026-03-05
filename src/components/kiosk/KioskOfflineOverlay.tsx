/**
 * Kiosk Offline Overlay - Shows offline status without blocking usage
 */

import { useOffline } from '@/contexts/OfflineContext';
import { WifiOff, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface KioskOfflineOverlayProps {
  largeTouch?: boolean;
}

export function KioskOfflineOverlay({ largeTouch = false }: KioskOfflineOverlayProps) {
  const { isOnline, pendingChanges, syncNow } = useOffline();
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Track last online timestamp
  useEffect(() => {
    if (isOnline) {
      setLastOnlineTime(new Date());
      setRetryCountdown(0);
    } else if (!lastOnlineTime) {
      // If we start offline, use current time as reference
      setLastOnlineTime(new Date());
    }
  }, [isOnline, lastOnlineTime]);

  // Auto-retry countdown when offline
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 0) return 30; // Reset to 30 seconds
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
      setRetryCountdown(30);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Desconhecido';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Don't show anything when online
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in">
      <div 
        className={cn(
          "bg-amber-50 dark:bg-amber-950/90 border border-amber-200 dark:border-amber-800",
          "rounded-xl shadow-lg p-4",
          "flex flex-col sm:flex-row items-start sm:items-center gap-4"
        )}
      >
        {/* Offline Icon */}
        <div className={cn(
          "flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900",
          largeTouch ? "h-14 w-14" : "h-12 w-12",
          "flex-shrink-0"
        )}>
          <WifiOff className={cn(
            "text-amber-600 dark:text-amber-400",
            largeTouch ? "h-7 w-7" : "h-6 w-6"
          )} />
        </div>

        {/* Status Info */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-amber-900 dark:text-amber-100",
            largeTouch && "text-lg"
          )}>
            Modo Offline
          </h3>
          
          <div className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-1 mt-1",
            "text-amber-700 dark:text-amber-300",
            largeTouch ? "text-base" : "text-sm"
          )}>
            {/* Last Sync */}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Última conexão: {formatLastSync(lastOnlineTime)}
            </span>

            {/* Pending Changes */}
            {pendingChanges > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {pendingChanges} alteração(ões) pendente(s)
              </span>
            )}
          </div>

          <p className={cn(
            "text-amber-600 dark:text-amber-400 mt-1",
            largeTouch ? "text-sm" : "text-xs"
          )}>
            O kiosk continua funcionando. Dados serão sincronizados ao reconectar.
          </p>
        </div>

        {/* Retry Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Auto-retry countdown */}
          {retryCountdown > 0 && !syncing && (
            <div className={cn(
              "text-amber-600 dark:text-amber-400 text-center",
              largeTouch ? "text-base" : "text-sm"
            )}>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentando em {retryCountdown}s</span>
              </div>
            </div>
          )}

          {/* Manual Retry Button */}
          <Button
            variant="outline"
            size={largeTouch ? "lg" : "default"}
            onClick={handleRetry}
            disabled={syncing}
            className={cn(
              "border-amber-300 dark:border-amber-700",
              "text-amber-700 dark:text-amber-300",
              "hover:bg-amber-100 dark:hover:bg-amber-900",
              largeTouch && "h-12 px-6"
            )}
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Agora
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
