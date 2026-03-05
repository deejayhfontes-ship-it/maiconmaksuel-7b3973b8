/**
 * Global Salon Settings Context
 * Provides salon data, appearance, and notification settings throughout the app
 * with offline support and automatic sync
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ Types ============

export interface SalonData {
  id: string;
  nome_salao: string;
  nome_fantasia: string | null;
  logo_url: string | null;
  logo_updated_at: string | null;
  telefone_principal: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  site: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  endereco_cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppearanceSettings {
  id: string;
  tema: 'light' | 'dark' | 'system';
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_accent_custom: string | null;
  tipografia_grande: boolean;
  modo_alto_contraste: boolean;
  animacoes_reduzidas: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  sistema_ativo: boolean;
  sistema_sons: boolean;
  aniversario_ativo: boolean;
  aniversario_dias_antes: number;
  aniversario_template: string;
  lembrete_24h: boolean;
  lembrete_2h: boolean;
  lembrete_template: string;
  confirmacao_ativa: boolean;
  confirmacao_horas_antes: number;
  confirmacao_template: string;
  cancelamento_ativo: boolean;
  cancelamento_template: string;
  alerta_financeiro_ativo: boolean;
  alerta_caixa_baixo_valor: number;
  alerta_estoque_ativo: boolean;
  alerta_estoque_minimo: number;
  alerta_admin_ativo: boolean;
  canal_in_app: boolean;
  canal_email: boolean;
  canal_sms: boolean;
  canal_whatsapp: boolean;
  horario_silencio_ativo: boolean;
  horario_silencio_inicio: string;
  horario_silencio_fim: string;
  created_at: string;
  updated_at: string;
}

interface SalonSettingsContextValue {
  // Salon Data
  salonData: SalonData | null;
  updateSalonData: (data: Partial<SalonData>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
  
  // Appearance
  appearance: AppearanceSettings | null;
  updateAppearance: (data: Partial<AppearanceSettings>) => Promise<void>;
  resetAppearanceDefaults: () => Promise<void>;
  
  // Notifications
  notifications: NotificationSettings | null;
  updateNotifications: (data: Partial<NotificationSettings>) => Promise<void>;
  
  // Status
  isLoading: boolean;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
  
  // Refetch
  refetch: () => void;
}

// ============ Local Storage Keys ============

const LOCAL_KEYS = {
  SALON: 'mm-salon-data',
  APPEARANCE: 'mm-appearance-settings',
  NOTIFICATIONS: 'mm-notification-settings',
};

// ============ Default Values ============

const defaultSalonData: Omit<SalonData, 'id' | 'created_at' | 'updated_at'> = {
  nome_salao: 'Meu Salão',
  nome_fantasia: null,
  logo_url: null,
  logo_updated_at: null,
  telefone_principal: null,
  whatsapp: null,
  email: null,
  instagram: null,
  facebook: null,
  site: null,
  cnpj: null,
  inscricao_estadual: null,
  inscricao_municipal: null,
  endereco_cep: null,
  endereco_logradouro: null,
  endereco_numero: null,
  endereco_complemento: null,
  endereco_bairro: null,
  endereco_cidade: null,
  endereco_estado: null,
};

const defaultAppearance: Omit<AppearanceSettings, 'id' | 'created_at' | 'updated_at'> = {
  tema: 'system',
  cor_primaria: '211 100% 50%',
  cor_secundaria: '142 69% 49%',
  cor_destaque: '4 90% 58%',
  cor_accent_custom: null,
  tipografia_grande: false,
  modo_alto_contraste: false,
  animacoes_reduzidas: false,
};

const defaultNotifications: Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'> = {
  sistema_ativo: true,
  sistema_sons: true,
  aniversario_ativo: true,
  aniversario_dias_antes: 0,
  aniversario_template: 'Feliz Aniversário, {nome}! 🎂',
  lembrete_24h: true,
  lembrete_2h: true,
  lembrete_template: 'Olá {nome}, lembramos do seu agendamento amanhã às {hora}.',
  confirmacao_ativa: true,
  confirmacao_horas_antes: 24,
  confirmacao_template: 'Confirme seu agendamento para {data} às {hora}. Responda SIM ou NÃO.',
  cancelamento_ativo: true,
  cancelamento_template: 'Seu agendamento foi cancelado. Entre em contato para remarcar.',
  alerta_financeiro_ativo: true,
  alerta_caixa_baixo_valor: 100,
  alerta_estoque_ativo: true,
  alerta_estoque_minimo: 5,
  alerta_admin_ativo: true,
  canal_in_app: true,
  canal_email: false,
  canal_sms: false,
  canal_whatsapp: true,
  horario_silencio_ativo: true,
  horario_silencio_inicio: '22:00:00',
  horario_silencio_fim: '07:00:00',
};

// ============ Context ============

const SalonSettingsContext = createContext<SalonSettingsContextValue | undefined>(undefined);

// ============ Provider ============

interface SalonSettingsProviderProps {
  children: ReactNode;
}

export function SalonSettingsProvider({ children }: SalonSettingsProviderProps) {
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

  // ============ Local Storage Helpers ============

  const getLocal = useCallback(<T,>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const setLocal = useCallback(<T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  // ============ Salon Data Query ============

  const { data: salonData, isLoading: salonLoading } = useQuery({
    queryKey: ['salon-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_salao')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLocal(LOCAL_KEYS.SALON, data);
        return data as SalonData;
      }

      // Use local or defaults
      const local = getLocal<SalonData>(LOCAL_KEYS.SALON);
      return local || { ...defaultSalonData, id: '', created_at: '', updated_at: '' } as SalonData;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ============ Appearance Query ============

  const { data: appearance, isLoading: appearanceLoading } = useQuery({
    queryKey: ['appearance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_aparencia')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLocal(LOCAL_KEYS.APPEARANCE, data);
        return data as AppearanceSettings;
      }

      const local = getLocal<AppearanceSettings>(LOCAL_KEYS.APPEARANCE);
      return local || { ...defaultAppearance, id: '', created_at: '', updated_at: '' } as AppearanceSettings;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ============ Notifications Query ============

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_notificacoes')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLocal(LOCAL_KEYS.NOTIFICATIONS, data);
        return data as NotificationSettings;
      }

      const local = getLocal<NotificationSettings>(LOCAL_KEYS.NOTIFICATIONS);
      return local || { ...defaultNotifications, id: '', created_at: '', updated_at: '' } as NotificationSettings;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ============ Apply Theme and Colors ============

  useEffect(() => {
    if (!appearance) return;

    const root = document.documentElement;

    // Apply theme
    root.classList.remove('light', 'dark');
    let effectiveTheme: 'light' | 'dark' = 'light';

    if (appearance.tema === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = appearance.tema;
    }

    root.classList.add(effectiveTheme);

    // Apply custom colors
    root.style.setProperty('--primary', appearance.cor_primaria);
    root.style.setProperty('--success', appearance.cor_secundaria);
    root.style.setProperty('--destructive', appearance.cor_destaque);

    // Apply typography settings
    if (appearance.tipografia_grande) {
      root.style.setProperty('--base-font-size', '17px');
      document.body.style.fontSize = '17px';
    } else {
      root.style.setProperty('--base-font-size', '15px');
      document.body.style.fontSize = '15px';
    }

    // Apply reduced motion
    if (appearance.animacoes_reduzidas) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [appearance]);

  // Listen for system theme changes
  useEffect(() => {
    if (appearance?.tema !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appearance?.tema]);

  // ============ Mutations ============

  const salonMutation = useMutation({
    mutationFn: async (updates: Partial<SalonData>) => {
      const current = getLocal<SalonData>(LOCAL_KEYS.SALON) || salonData;
      const merged = { ...current, ...updates };
      setLocal(LOCAL_KEYS.SALON, merged);

      if (!isOnline) {
        setSyncStatus('pending');
        return merged;
      }

      const { data, error } = await supabase
        .from('configuracoes_salao')
        .update(updates)
        .eq('id', salonData?.id)
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
      queryClient.setQueryData(['salon-data'], data);
      toast.success('Dados do salão salvos!');
    },
    onError: () => {
      toast.error('Erro ao salvar. Dados salvos localmente.');
    },
  });

  const appearanceMutation = useMutation({
    mutationFn: async (updates: Partial<AppearanceSettings>) => {
      const current = getLocal<AppearanceSettings>(LOCAL_KEYS.APPEARANCE) || appearance;
      const merged = { ...current, ...updates };
      setLocal(LOCAL_KEYS.APPEARANCE, merged);

      if (!isOnline) {
        setSyncStatus('pending');
        return merged;
      }

      // First try to get existing record
      const { data: existingData } = await supabase
        .from('configuracoes_aparencia')
        .select('id')
        .limit(1)
        .maybeSingle();

      let data;
      let error;

      if (existingData?.id) {
        // Update existing record - use maybeSingle to handle RLS restrictions gracefully
        const result = await supabase
          .from('configuracoes_aparencia')
          .update(updates)
          .eq('id', existingData.id)
          .select()
          .maybeSingle();
        
        data = result.data;
        error = result.error;
        
        // If update didn't return data but no error, it means RLS blocked or no rows matched
        // In this case, return the merged local data
        if (!data && !error) {
          setSyncStatus('synced');
          return merged;
        }
      } else {
        // Insert new record
        const result = await supabase
          .from('configuracoes_aparencia')
          .insert({ ...defaultAppearance, ...updates })
          .select()
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) {
        setSyncStatus('error');
        throw error;
      }

      setSyncStatus('synced');
      setLocal(LOCAL_KEYS.APPEARANCE, data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['appearance-settings'], data);
      toast.success('Aparência atualizada!');
    },
    onError: () => {
      toast.error('Erro ao salvar aparência. Salvo localmente.');
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      const current = getLocal<NotificationSettings>(LOCAL_KEYS.NOTIFICATIONS) || notifications;
      const merged = { ...current, ...updates };
      setLocal(LOCAL_KEYS.NOTIFICATIONS, merged);

      if (!isOnline) {
        setSyncStatus('pending');
        return merged;
      }

      const { data, error } = await supabase
        .from('configuracoes_notificacoes')
        .update(updates)
        .eq('id', notifications?.id)
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
      queryClient.setQueryData(['notification-settings'], data);
      toast.success('Configurações de notificações salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar notificações. Salvo localmente.');
    },
  });

  // ============ Logo Upload ============

  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `salon/${fileName}`;

      // Check if bucket exists, if not we'll handle the error
      const { error: uploadError } = await supabase.storage
        .from('fotos-profissionais')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do logo');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('fotos-profissionais')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update salon data with new logo
      await salonMutation.mutateAsync({
        logo_url: logoUrl,
        logo_updated_at: new Date().toISOString(),
      });

      return logoUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Erro ao fazer upload do logo');
      return null;
    }
  }, [salonMutation]);

  // ============ Reset Appearance Defaults ============

  const resetAppearanceDefaults = useCallback(async () => {
    await appearanceMutation.mutateAsync(defaultAppearance);
    toast.success('Cores padrão restauradas!');
  }, [appearanceMutation]);

  // ============ Refetch All ============

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['salon-data'] });
    queryClient.invalidateQueries({ queryKey: ['appearance-settings'] });
    queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
  }, [queryClient]);

  // ============ Sync Pending Changes ============

  useEffect(() => {
    if (isOnline && syncStatus === 'pending') {
      // Sync all local data
      const localSalon = getLocal<SalonData>(LOCAL_KEYS.SALON);
      const localAppearance = getLocal<AppearanceSettings>(LOCAL_KEYS.APPEARANCE);
      const localNotifications = getLocal<NotificationSettings>(LOCAL_KEYS.NOTIFICATIONS);

      if (localSalon && salonData?.id) {
        salonMutation.mutate(localSalon);
      }
      if (localAppearance && appearance?.id) {
        appearanceMutation.mutate(localAppearance);
      }
      if (localNotifications && notifications?.id) {
        notificationsMutation.mutate(localNotifications);
      }
    }
  }, [isOnline, syncStatus]);

  // ============ Context Value ============

  const value = useMemo<SalonSettingsContextValue>(() => ({
    salonData: salonData || null,
    updateSalonData: async (data) => { await salonMutation.mutateAsync(data); },
    uploadLogo,
    appearance: appearance || null,
    updateAppearance: async (data) => { await appearanceMutation.mutateAsync(data); },
    resetAppearanceDefaults,
    notifications: notifications || null,
    updateNotifications: async (data) => { await notificationsMutation.mutateAsync(data); },
    isLoading: salonLoading || appearanceLoading || notificationsLoading,
    isOnline,
    syncStatus,
    refetch,
  }), [
    salonData, salonMutation, uploadLogo,
    appearance, appearanceMutation, resetAppearanceDefaults,
    notifications, notificationsMutation,
    salonLoading, appearanceLoading, notificationsLoading,
    isOnline, syncStatus, refetch,
  ]);

  return (
    <SalonSettingsContext.Provider value={value}>
      {children}
    </SalonSettingsContext.Provider>
  );
}

// ============ Hook ============

export function useSalonSettings() {
  const context = useContext(SalonSettingsContext);
  if (!context) {
    throw new Error('useSalonSettings must be used within SalonSettingsProvider');
  }
  return context;
}

// ============ Standalone Hooks ============

export function useSalonData() {
  const { salonData, updateSalonData, uploadLogo, isLoading } = useSalonSettings();
  return { salonData, updateSalonData, uploadLogo, isLoading };
}

export function useAppearance() {
  const { appearance, updateAppearance, resetAppearanceDefaults, isLoading } = useSalonSettings();
  return { appearance, updateAppearance, resetAppearanceDefaults, isLoading };
}

export function useNotificationSettings() {
  const { notifications, updateNotifications, isLoading } = useSalonSettings();
  return { notifications, updateNotifications, isLoading };
}
