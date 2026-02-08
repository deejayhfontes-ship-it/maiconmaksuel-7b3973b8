/**
 * Hook for managing access PINs (CRUD operations)
 * Used by admin users to manage PIN configurations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PinRole = 'admin' | 'notebook' | 'kiosk';

export interface PinoAcesso {
  id: string;
  pin: string;
  nome: string;
  role: PinRole;
  descricao: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePinoData {
  pin: string;
  nome: string;
  role: PinRole;
  descricao?: string;
}

export interface UpdatePinoData {
  pin?: string;
  nome?: string;
  role?: PinRole;
  descricao?: string;
  ativo?: boolean;
}

export function usePinosAcesso() {
  const [pinos, setPinos] = useState<PinoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch all PINs
  const fetchPinos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pinos_acesso')
        .select('*')
        .order('role', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      
      setPinos((data || []) as PinoAcesso[]);
    } catch (error) {
      console.error('Error fetching PINs:', error);
      toast.error('Erro ao carregar PINs de acesso');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize default PINs if none exist (or ensure defaults exist)
  const initializeDefaultPins = useCallback(async () => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('pinos_acesso')
        .select('id, pin, role')
        .limit(10);

      if (checkError) throw checkError;

      // Default PINs configuration
      const defaultPins: Array<{ pin: string; nome: string; role: 'admin' | 'notebook' | 'kiosk'; descricao: string; ativo: boolean }> = [
        { pin: '0000', nome: 'Administrador', role: 'admin', descricao: 'Acesso total ao sistema', ativo: true },
        { pin: '1234', nome: 'Notebook', role: 'notebook', descricao: 'Agenda e gestão básica', ativo: true },
        { pin: '9999', nome: 'Kiosk', role: 'kiosk', descricao: 'Caixa, ponto e mini agenda', ativo: true },
      ];

      // If no PINs exist, create all defaults
      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase
          .from('pinos_acesso')
          .insert(defaultPins);

        if (insertError) throw insertError;
        
        console.log('[PINs] Default PINs created: 0000 (admin), 1234 (notebook), 9999 (kiosk)');
        await fetchPinos();
        return;
      }

      // Check if each default role has at least one PIN, if not create it
      const existingRoles = new Set(existing.map(p => p.role));
      const missingPins = defaultPins.filter(dp => !existingRoles.has(dp.role));

      if (missingPins.length > 0) {
        const { error: insertError } = await supabase
          .from('pinos_acesso')
          .insert(missingPins);

        if (!insertError) {
          console.log('[PINs] Created missing default PINs for roles:', missingPins.map(p => p.role).join(', '));
          await fetchPinos();
        }
      }
    } catch (error) {
      console.error('Error initializing default PINs:', error);
    }
  }, [fetchPinos]);

  // Load on mount
  useEffect(() => {
    const init = async () => {
      await initializeDefaultPins();
      await fetchPinos();
    };
    init();
  }, [fetchPinos, initializeDefaultPins]);

  // Validate PIN format (4 digits)
  const validatePin = (pin: string): boolean => {
    return /^\d{4}$/.test(pin);
  };

  // Check if PIN is unique (excluding current ID for updates)
  const isPinUnique = async (pin: string, excludeId?: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('pinos_acesso')
      .select('id')
      .eq('pin', pin)
      .neq('id', excludeId || '');

    if (error) return false;
    return !data || data.length === 0;
  };

  // Create new PIN
  const createPino = async (data: CreatePinoData): Promise<boolean> => {
    if (!validatePin(data.pin)) {
      toast.error('PIN deve ter exatamente 4 dígitos');
      return false;
    }

    setSaving(true);
    try {
      const isUnique = await isPinUnique(data.pin);
      if (!isUnique) {
        toast.error('Este PIN já está em uso');
        return false;
      }

      const { error } = await supabase
        .from('pinos_acesso')
        .insert([{ ...data, ativo: true }]);

      if (error) throw error;

      toast.success('PIN criado com sucesso');
      await fetchPinos();
      return true;
    } catch (error) {
      console.error('Error creating PIN:', error);
      toast.error('Erro ao criar PIN');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update existing PIN
  const updatePino = async (id: string, data: UpdatePinoData): Promise<boolean> => {
    if (data.pin && !validatePin(data.pin)) {
      toast.error('PIN deve ter exatamente 4 dígitos');
      return false;
    }

    setSaving(true);
    try {
      if (data.pin) {
        const isUnique = await isPinUnique(data.pin, id);
        if (!isUnique) {
          toast.error('Este PIN já está em uso');
          return false;
        }
      }

      const { error } = await supabase
        .from('pinos_acesso')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('PIN atualizado com sucesso');
      await fetchPinos();
      return true;
    } catch (error) {
      console.error('Error updating PIN:', error);
      toast.error('Erro ao atualizar PIN');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Toggle PIN active status
  const togglePinoAtivo = async (id: string, ativo: boolean): Promise<boolean> => {
    return updatePino(id, { ativo });
  };

  // Delete PIN
  const deletePino = async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pinos_acesso')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('PIN excluído com sucesso');
      await fetchPinos();
      return true;
    } catch (error) {
      console.error('Error deleting PIN:', error);
      toast.error('Erro ao excluir PIN');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    pinos,
    loading,
    saving,
    fetchPinos,
    createPino,
    updatePino,
    togglePinoAtivo,
    deletePino,
    validatePin,
  };
}
