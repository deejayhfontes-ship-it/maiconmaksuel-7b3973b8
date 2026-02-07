/**
 * System Settings Hook
 * Manages local persistence and Supabase sync for all system settings
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LOCAL_SETTINGS_KEY = 'mm-system-settings';

export interface SystemSettings {
  id: string;
  // Caixa/PDV Settings
  caixa_valor_abertura_padrao: number;
  caixa_requer_confirmacao_abertura: boolean;
  caixa_requer_confirmacao_fechamento: boolean;
  caixa_permitir_multiplos_abertos: boolean;
  // Agenda Settings
  agenda_duracao_padrao_minutos: number;
  agenda_permitir_encaixe: boolean;
  agenda_horario_inicio: string;
  agenda_horario_fim: string;
  agenda_intervalo_minutos: number;
  agenda_dias_antecedencia_max: number;
  // Services/Products Settings
  servicos_comissao_padrao: number;
  produtos_comissao_padrao: number;
  produtos_alerta_estoque_minimo: number;
  produtos_vendas_habilitadas: boolean;
  // Device Settings
  dispositivo_modo_padrao: string;
  // Backup Settings
  backup_ultimo_data: string | null;
  backup_ultimo_tamanho_bytes: number | null;
  backup_ultimo_integridade: boolean | null;
  backup_modulos_selecionados: string[];
  backup_formato_padrao: string;
  backup_criptografado: boolean;
  // System Info
  versao_atual: string;
  ambiente: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RegisteredDevice {
  id: string;
  device_id: string;
  nome: string;
  tipo: 'admin' | 'notebook' | 'kiosk' | 'auto';
  ultimo_acesso: string;
  ip_address: string | null;
  user_agent: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'> = {
  caixa_valor_abertura_padrao: 0,
  caixa_requer_confirmacao_abertura: true,
  caixa_requer_confirmacao_fechamento: true,
  caixa_permitir_multiplos_abertos: false,
  agenda_duracao_padrao_minutos: 30,
  agenda_permitir_encaixe: true,
  agenda_horario_inicio: '08:00',
  agenda_horario_fim: '20:00',
  agenda_intervalo_minutos: 15,
  agenda_dias_antecedencia_max: 60,
  servicos_comissao_padrao: 30,
  produtos_comissao_padrao: 10,
  produtos_alerta_estoque_minimo: 5,
  produtos_vendas_habilitadas: true,
  dispositivo_modo_padrao: 'auto',
  backup_ultimo_data: null,
  backup_ultimo_tamanho_bytes: null,
  backup_ultimo_integridade: null,
  backup_modulos_selecionados: ['clientes', 'agendamentos', 'financeiro', 'produtos', 'estoque', 'profissionais', 'servicos', 'configuracoes'],
  backup_formato_padrao: 'zip',
  backup_criptografado: false,
  versao_atual: '1.0.0',
  ambiente: 'production',
};

// Generate a unique device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem('mm-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('mm-device-id', deviceId);
  }
  return deviceId;
}

export function useSystemSettings() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load settings from localStorage
  const getLocalSettings = useCallback((): Partial<SystemSettings> | null => {
    try {
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Save settings to localStorage
  const saveLocalSettings = useCallback((settings: Partial<SystemSettings>) => {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, []);

  // Fetch settings from Supabase
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        saveLocalSettings(data);
        setSyncStatus('synced');
        return data as SystemSettings;
      }

      // If no settings exist, use local or defaults
      const localSettings = getLocalSettings();
      if (localSettings) {
        return { ...defaultSettings, ...localSettings } as SystemSettings;
      }

      return { ...defaultSettings, id: '', created_at: '', updated_at: '' } as SystemSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      // Always save locally first
      const currentLocal = getLocalSettings() || {};
      saveLocalSettings({ ...currentLocal, ...updates });

      if (!isOnline) {
        setSyncStatus('pending');
        return { ...settings, ...updates };
      }

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .update(updates)
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) {
        setSyncStatus('error');
        throw error;
      }

      setSyncStatus('synced');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['system-settings'], data);
      toast.success('Configurações salvas');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações. Salvo localmente.');
    },
  });

  // Sync pending changes when coming back online
  useEffect(() => {
    if (isOnline && syncStatus === 'pending') {
      const localSettings = getLocalSettings();
      if (localSettings && settings?.id) {
        updateMutation.mutate(localSettings);
      }
    }
  }, [isOnline, syncStatus]);

  // Device management
  const { data: devices } = useQuery({
    queryKey: ['registered-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispositivos_registrados')
        .select('*')
        .order('ultimo_acesso', { ascending: false });

      if (error) throw error;
      return data as RegisteredDevice[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const registerDevice = useCallback(async (nome: string, tipo: 'admin' | 'notebook' | 'kiosk' | 'auto') => {
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('dispositivos_registrados')
      .upsert({
        device_id: deviceId,
        nome,
        tipo,
        ultimo_acesso: new Date().toISOString(),
        user_agent: navigator.userAgent,
      }, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao registrar dispositivo');
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['registered-devices'] });
    return data;
  }, [queryClient]);

  const updateDeviceMode = useCallback(async (deviceId: string, tipo: 'admin' | 'notebook' | 'kiosk' | 'auto') => {
    const { error } = await supabase
      .from('dispositivos_registrados')
      .update({ tipo })
      .eq('device_id', deviceId);

    if (error) {
      toast.error('Erro ao atualizar dispositivo');
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ['registered-devices'] });
    toast.success('Modo do dispositivo atualizado');
    return true;
  }, [queryClient]);

  const removeDevice = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('dispositivos_registrados')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover dispositivo');
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ['registered-devices'] });
    toast.success('Dispositivo removido');
    return true;
  }, [queryClient]);

  // Update backup info
  const updateBackupInfo = useCallback((size: number, success: boolean) => {
    updateMutation.mutate({
      backup_ultimo_data: new Date().toISOString(),
      backup_ultimo_tamanho_bytes: size,
      backup_ultimo_integridade: success,
    });
  }, [updateMutation]);

  return {
    settings: settings || ({ ...defaultSettings, id: '', created_at: '', updated_at: '' } as SystemSettings),
    isLoading,
    error,
    isOnline,
    syncStatus,
    updateSettings: updateMutation.mutate,
    isSaving: updateMutation.isPending,
    devices: devices || [],
    registerDevice,
    updateDeviceMode,
    removeDevice,
    updateBackupInfo,
    currentDeviceId: getDeviceId(),
  };
}
