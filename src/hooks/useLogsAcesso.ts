/**
 * Hook for managing access logs
 * Tracks PIN login attempts with device and timestamp info
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LogAcesso {
  id: string;
  pino_id: string | null;
  nome_usuario: string;
  role: string;
  dispositivo: string | null;
  ip_address: string | null;
  user_agent: string | null;
  sucesso: boolean;
  motivo_falha: string | null;
  created_at: string;
}

export interface CreateLogData {
  pino_id?: string;
  nome_usuario: string;
  role: string;
  dispositivo?: string;
  sucesso: boolean;
  motivo_falha?: string;
}

const LOGS_STORAGE_KEY = 'mm-logs-acesso-offline';

export function useLogsAcesso() {
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [loading, setLoading] = useState(true);

  // Load logs from localStorage (offline cache)
  const loadOfflineLogs = useCallback((): LogAcesso[] => {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save logs to localStorage
  const saveOfflineLogs = useCallback((logsToSave: LogAcesso[]) => {
    // Keep only the last 100 logs offline
    const trimmed = logsToSave.slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  }, []);

  // Fetch logs from Supabase
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logs_acesso')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const fetchedLogs = (data || []) as LogAcesso[];
      setLogs(fetchedLogs);
      saveOfflineLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Fall back to offline cache
      setLogs(loadOfflineLogs());
    } finally {
      setLoading(false);
    }
  }, [loadOfflineLogs, saveOfflineLogs]);

  // Initialize on mount
  useEffect(() => {
    // Load offline cache immediately
    setLogs(loadOfflineLogs());
    // Then fetch from server
    fetchLogs();
  }, [fetchLogs, loadOfflineLogs]);

  // Create a new log entry
  const createLog = useCallback(async (data: CreateLogData): Promise<boolean> => {
    const logEntry = {
      pino_id: data.pino_id || null,
      nome_usuario: data.nome_usuario,
      role: data.role,
      dispositivo: data.dispositivo || (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'),
      ip_address: null as string | null,
      user_agent: navigator.userAgent,
      sucesso: data.sucesso,
      motivo_falha: data.motivo_falha || null,
    };

    try {
      const { error } = await supabase
        .from('logs_acesso')
        .insert([logEntry]);

      if (error) throw error;

      // Refresh logs
      await fetchLogs();
      return true;
    } catch (error) {
      console.error('Error creating log:', error);
      
      // Save offline
      const offlineLog = {
        ...logEntry,
        id: `offline-${Date.now()}`,
      } as LogAcesso;
      
      const currentLogs = loadOfflineLogs();
      saveOfflineLogs([offlineLog, ...currentLogs]);
      setLogs(prev => [offlineLog, ...prev]);
      
      return false;
    }
  }, [fetchLogs, loadOfflineLogs, saveOfflineLogs]);

  // Clear old logs (keep last 30 days)
  const clearOldLogs = useCallback(async (): Promise<boolean> => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('logs_acesso')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      await fetchLogs();
      return true;
    } catch (error) {
      console.error('Error clearing old logs:', error);
      return false;
    }
  }, [fetchLogs]);

  return {
    logs,
    loading,
    fetchLogs,
    createLog,
    clearOldLogs,
  };
}
