// Visual indicator for offline status and pending changes
import { useOffline } from '@/contexts/OfflineContext';
import { Cloud, CloudOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function OfflineIndicator() {
  const { isOnline, pendingChanges, syncNow } = useOffline();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await syncNow();
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
              isOnline
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isOnline ? (
              <>
                <Cloud className="h-3 w-3" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline
            ? 'Conectado - dados sincronizados com o servidor'
            : 'Offline - alterações serão sincronizadas quando reconectar'}
        </TooltipContent>
      </Tooltip>

      {/* Pending changes indicator */}
      {pendingChanges > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 gap-1.5',
                isOnline
                  ? 'text-primary hover:text-primary/90 hover:bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              onClick={handleSync}
              disabled={!isOnline || syncing}
            >
              {syncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="font-medium">{pendingChanges}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {pendingChanges} alteração(ões) pendente(s)
            {isOnline ? ' - clique para sincronizar' : ' - aguardando conexão'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
