/**
 * Kiosk Settings Hook
 * Manages local persistence and Supabase sync for kiosk-specific settings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LOCAL_KIOSK_KEY = 'mm-kiosk-settings';

export interface KioskRoutesEnabled {
  kiosk: boolean;
  kiosk_caixa: boolean;
  kiosk_comandas: boolean;
  kiosk_agenda: boolean;
  kiosk_ponto: boolean;
  kiosk_espelho: boolean;
}

export interface KioskRouteAccess {
  [routeKey: string]: string; // ISO timestamp of last access
}

export interface KioskSettings {
  id: string;
  // Route settings
  rotas_habilitadas: KioskRoutesEnabled;
  ultimo_acesso_rotas: KioskRouteAccess;
  // Window/System lockdown
  bloquear_arraste_janela: boolean;
  bloquear_posicao_janela: boolean;
  bloquear_tamanho_janela: boolean;
  forcar_fullscreen: boolean;
  ocultar_controles_janela: boolean;
  bloquear_atalhos_sistema: boolean;
  auto_relancar_se_fechado: boolean;
  // Agenda kiosk settings
  agenda_visivel: boolean;
  agenda_somente_leitura: boolean;
  agenda_profissionais_visiveis: string[];
  agenda_intervalo_tempo: 'proximas_2h' | 'hoje' | 'dia_completo';
  agenda_mostrar_nomes_servicos: boolean;
  agenda_modo_privacidade: boolean;
  // Ponto settings
  ponto_habilitado: boolean;
  ponto_metodo: 'lista_touch' | 'qr_code' | 'codigo_funcionario';
  ponto_mostrar_foto_nome: boolean;
  ponto_requer_confirmacao: boolean;
  ponto_prevenir_duplicados: boolean;
  // Content modules
  modulo_espelho_caixa: boolean;
  modulo_comandas_abertas: boolean;
  modulo_mini_agenda: boolean;
  modulo_ponto: boolean;
  modulo_tela_espera: boolean;
  // Visual settings
  logo_url: string | null;
  logo_animacao: 'none' | 'fade' | 'slide' | 'pulse' | 'loop';
  logo_animacao_velocidade: number;
  fundo_tipo: 'color' | 'gradient' | 'image' | 'video';
  fundo_valor: string;
  tipografia_grande: boolean;
  tema_kiosk: 'dark' | 'light';
  // Interaction rules
  apenas_touch: boolean;
  desabilitar_teclado: boolean;
  alvos_touch_grandes: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

const defaultKioskSettings: Omit<KioskSettings, 'id' | 'created_at' | 'updated_at'> = {
  rotas_habilitadas: {
    kiosk: true,
    kiosk_caixa: false, // Disabled - no cash register in client kiosk
    kiosk_comandas: false, // Disabled - no comandas management
    kiosk_agenda: false, // Disabled - no agenda exposure
    kiosk_ponto: true, // Enabled - employee time clock
    kiosk_espelho: false, // Disabled - no cash mirror
  },
  ultimo_acesso_rotas: {},
  bloquear_arraste_janela: true,
  bloquear_posicao_janela: true,
  bloquear_tamanho_janela: true,
  forcar_fullscreen: true,
  ocultar_controles_janela: true,
  bloquear_atalhos_sistema: true,
  auto_relancar_se_fechado: true,
  agenda_visivel: false, // Disabled - client-facing only
  agenda_somente_leitura: true,
  agenda_profissionais_visiveis: [],
  agenda_intervalo_tempo: 'hoje',
  agenda_mostrar_nomes_servicos: false,
  agenda_modo_privacidade: true, // Privacy mode enabled
  ponto_habilitado: true,
  ponto_metodo: 'lista_touch',
  ponto_mostrar_foto_nome: true,
  ponto_requer_confirmacao: true,
  ponto_prevenir_duplicados: true,
  modulo_espelho_caixa: false, // Disabled - no cash mirror
  modulo_comandas_abertas: false, // Disabled - no comandas
  modulo_mini_agenda: false, // Disabled - no agenda
  modulo_ponto: true, // Enabled
  modulo_tela_espera: true, // Enabled - idle screen
  logo_url: null,
  logo_animacao: 'none',
  logo_animacao_velocidade: 1000,
  fundo_tipo: 'color',
  fundo_valor: '', // Empty = use theme background
  tipografia_grande: true,
  tema_kiosk: 'light', // Changed default to light
  apenas_touch: true,
  desabilitar_teclado: true,
  alvos_touch_grandes: true,
};

// Kiosk route mapping - Minimal client-facing routes only
export const KIOSK_ROUTES = {
  kiosk: { path: '/kiosk', label: 'Início' },
  kiosk_ponto: { path: '/kiosk/ponto', label: 'Ponto Eletrônico' },
  // Legacy routes disabled for client-facing kiosk:
  kiosk_caixa: { path: '/kiosk/caixa', label: 'Caixa', disabled: true },
  kiosk_comandas: { path: '/kiosk/caixa/comandas', label: 'Comandas', disabled: true },
  kiosk_agenda: { path: '/kiosk/agenda', label: 'Agenda', disabled: true },
  kiosk_espelho: { path: '/kiosk/espelho-cliente', label: 'Espelho Cliente', disabled: true },
} as const;

export function useKioskSettings() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
  const [kioskUptime, setKioskUptime] = useState<number>(0);
  
  // Debounce route access updates to batch multiple accesses into single PATCH
  const pendingRouteAccessRef = useRef<Set<keyof KioskRoutesEnabled>>(new Set());
  const routeAccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track uptime
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setKioskUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
  const getLocalSettings = useCallback((): Partial<KioskSettings> | null => {
    try {
      const stored = localStorage.getItem(LOCAL_KIOSK_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Save settings to localStorage
  const saveLocalSettings = useCallback((settings: Partial<KioskSettings>) => {
    try {
      localStorage.setItem(LOCAL_KIOSK_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving kiosk settings to localStorage:', error);
    }
  }, []);

  // Fetch settings from Supabase
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['kiosk-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_kiosk')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsed = {
          ...data,
          rotas_habilitadas: (data.rotas_habilitadas || defaultKioskSettings.rotas_habilitadas) as unknown as KioskRoutesEnabled,
          ultimo_acesso_rotas: (data.ultimo_acesso_rotas || {}) as unknown as KioskRouteAccess,
        } as KioskSettings;
        saveLocalSettings(parsed);
        setSyncStatus('synced');
        return parsed;
      }

      // If no settings exist, use local or defaults
      const localSettings = getLocalSettings();
      if (localSettings) {
        return { ...defaultKioskSettings, ...localSettings } as KioskSettings;
      }

      return { ...defaultKioskSettings, id: '', created_at: '', updated_at: '' } as KioskSettings;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<KioskSettings>) => {
      const currentLocal = getLocalSettings() || {};
      saveLocalSettings({ ...currentLocal, ...updates });

      if (!isOnline) {
        setSyncStatus('pending');
        return { ...settings, ...updates };
      }

      // Convert to DB-compatible format
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.rotas_habilitadas) {
        dbUpdates.rotas_habilitadas = updates.rotas_habilitadas as unknown as Record<string, unknown>;
      }
      if (updates.ultimo_acesso_rotas) {
        dbUpdates.ultimo_acesso_rotas = updates.ultimo_acesso_rotas as unknown as Record<string, unknown>;
      }

      const { data, error } = await supabase
        .from('configuracoes_kiosk')
        .update(dbUpdates)
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
      queryClient.setQueryData(['kiosk-settings'], data);
      toast.success('Configurações do kiosk salvas');
    },
    onError: (error) => {
      console.error('Error saving kiosk settings:', error);
      toast.error('Erro ao salvar. Salvo localmente.');
    },
  });

  // Update route access timestamp - DEBOUNCED to batch multiple accesses
  const updateRouteAccess = useCallback((routeKey: keyof KioskRoutesEnabled) => {
    if (!settings) return;
    
    // Add to pending set
    pendingRouteAccessRef.current.add(routeKey);
    
    // Clear existing timeout
    if (routeAccessTimeoutRef.current) {
      clearTimeout(routeAccessTimeoutRef.current);
    }
    
    // Debounce for 2 seconds to batch multiple route accesses
    routeAccessTimeoutRef.current = setTimeout(() => {
      const routesToUpdate = Array.from(pendingRouteAccessRef.current);
      if (routesToUpdate.length === 0) return;
      
      // Create timestamp object for all pending routes
      const now = new Date().toISOString();
      const newAccess = { ...settings.ultimo_acesso_rotas };
      routesToUpdate.forEach(key => {
        newAccess[key] = now;
      });
      
      // Clear pending set and send batched update
      pendingRouteAccessRef.current.clear();
      routeAccessTimeoutRef.current = null;
      updateMutation.mutate({ ultimo_acesso_rotas: newAccess });
    }, 2000);
  }, [settings, updateMutation]);
  
  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (routeAccessTimeoutRef.current) {
        clearTimeout(routeAccessTimeoutRef.current);
      }
    };
  }, []);

  // Check if a kiosk route is enabled
  const isRouteEnabled = useCallback((routeKey: keyof KioskRoutesEnabled): boolean => {
    if (!settings) return true;
    return settings.rotas_habilitadas[routeKey] ?? true;
  }, [settings]);

  // Reset layout
  const resetLayout = useCallback(() => {
    updateMutation.mutate({
      modulo_espelho_caixa: true,
      modulo_comandas_abertas: true,
      modulo_mini_agenda: true,
      modulo_ponto: true,
      modulo_tela_espera: true,
    });
    toast.success('Layout do kiosk resetado');
  }, [updateMutation]);

  // Reset visual settings
  const resetVisual = useCallback(() => {
    updateMutation.mutate({
      logo_url: null,
      logo_animacao: 'none',
      logo_animacao_velocidade: 1000,
      fundo_tipo: 'color',
      fundo_valor: '#1a1a2e',
      tipografia_grande: true,
      tema_kiosk: 'dark',
    });
    toast.success('Configurações visuais resetadas');
  }, [updateMutation]);

  // Clear local cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(LOCAL_KIOSK_KEY);
    queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] });
    toast.success('Cache do kiosk limpo');
  }, [queryClient]);

  // Force full resync
  const forceResync = useCallback(async () => {
    setSyncStatus('pending');
    try {
      await queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] });
      await queryClient.refetchQueries({ queryKey: ['kiosk-settings'] });
      setSyncStatus('synced');
      toast.success('Sincronização completa realizada');
    } catch {
      setSyncStatus('error');
      toast.error('Erro ao sincronizar');
    }
  }, [queryClient]);

  // Factory reset (kiosk only)
  const factoryReset = useCallback(() => {
    updateMutation.mutate(defaultKioskSettings as Partial<KioskSettings>);
    localStorage.removeItem(LOCAL_KIOSK_KEY);
    toast.success('Configurações do kiosk restauradas para o padrão');
  }, [updateMutation]);

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    settings: settings || ({ ...defaultKioskSettings, id: '', created_at: '', updated_at: '' } as KioskSettings),
    isLoading,
    error,
    isOnline,
    syncStatus,
    updateSettings: updateMutation.mutate,
    isSaving: updateMutation.isPending,
    updateRouteAccess,
    isRouteEnabled,
    resetLayout,
    resetVisual,
    clearCache,
    forceResync,
    factoryReset,
    kioskUptime,
    formatUptime: () => formatUptime(kioskUptime),
    KIOSK_ROUTES,
  };
}
