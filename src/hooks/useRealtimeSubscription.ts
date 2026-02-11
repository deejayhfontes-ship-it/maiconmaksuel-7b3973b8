import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type RealtimeOpts = {
  schema?: string;
  filter?: string;
  channelPrefix?: string;
  throttleMs?: number;
};

/**
 * Subscribes to Supabase Realtime changes on a table and
 * invalidates the given React Query key on every INSERT/UPDATE/DELETE.
 */
export function useRealtimeSubscription(
  table: string,
  queryKey: QueryKey,
  opts: RealtimeOpts = {}
) {
  const queryClient = useQueryClient();
  const { schema = 'public', filter, channelPrefix = 'rt', throttleMs = 300 } = opts;
  const lastFireRef = useRef(0);

  useEffect(() => {
    if (!table) return;

    const channelName = `${channelPrefix}:${schema}:${table}${filter ? `:${filter}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema, table, ...(filter ? { filter } : {}) },
        () => {
          const now = Date.now();
          if (now - lastFireRef.current < throttleMs) return;
          lastFireRef.current = now;
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter, channelPrefix, throttleMs, queryClient, queryKey]);
}

/**
 * Subscribes to Supabase Realtime changes on a table and
 * calls a callback function (e.g. a refetch/reload) on every change.
 * Use this for pages that don't use React Query.
 */
export function useRealtimeCallback(
  table: string,
  callback: () => void,
  opts: RealtimeOpts = {}
) {
  const { schema = 'public', filter, channelPrefix = 'rt', throttleMs = 300 } = opts;
  const lastFireRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!table) return;

    const channelName = `${channelPrefix}:${schema}:${table}:cb${filter ? `:${filter}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema, table, ...(filter ? { filter } : {}) },
        () => {
          const now = Date.now();
          if (now - lastFireRef.current < throttleMs) return;
          lastFireRef.current = now;
          callbackRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter, channelPrefix, throttleMs]);
}
