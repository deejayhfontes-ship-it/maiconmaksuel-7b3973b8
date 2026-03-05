/**
 * Hook for managing module permissions per role
 * Controls granular access to system modules
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Modulo = 
  | 'agenda'
  | 'atendimentos'
  | 'servicos'
  | 'profissionais'
  | 'produtos'
  | 'clientes'
  | 'caixa'
  | 'financeiro'
  | 'relatorios'
  | 'configuracoes'
  | 'notas_fiscais';

export interface PermissaoModulo {
  id: string;
  role: string;
  modulo: Modulo;
  pode_visualizar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuloConfig {
  id: Modulo;
  label: string;
  description: string;
}

export const MODULOS_CONFIG: ModuloConfig[] = [
  { id: 'agenda', label: 'Agenda', description: 'Agendamentos e calendário' },
  { id: 'atendimentos', label: 'Atendimentos', description: 'Comandas e atendimentos' },
  { id: 'servicos', label: 'Serviços', description: 'Catálogo de serviços' },
  { id: 'profissionais', label: 'Profissionais', description: 'Gestão de profissionais' },
  { id: 'produtos', label: 'Produtos', description: 'Estoque e produtos' },
  { id: 'clientes', label: 'Clientes', description: 'Cadastro de clientes' },
  { id: 'caixa', label: 'Caixa', description: 'PDV e movimentações' },
  { id: 'financeiro', label: 'Financeiro', description: 'Finanças e relatórios' },
  { id: 'relatorios', label: 'Relatórios', description: 'Relatórios do sistema' },
  { id: 'configuracoes', label: 'Configurações', description: 'Configurações gerais' },
  { id: 'notas_fiscais', label: 'Notas Fiscais', description: 'Emissão de NF' },
];

const PERMISSIONS_STORAGE_KEY = 'mm-permissoes-modulos-offline';

export function usePermissoesModulos() {
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load from localStorage (offline cache)
  const loadOfflinePermissions = useCallback((): PermissaoModulo[] => {
    try {
      const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save to localStorage
  const saveOfflinePermissions = useCallback((perms: PermissaoModulo[]) => {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
  }, []);

  // Fetch permissions from Supabase
  const fetchPermissoes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permissoes_modulos')
        .select('*')
        .order('role')
        .order('modulo');

      if (error) throw error;

      const fetchedPerms = (data || []) as PermissaoModulo[];
      setPermissoes(fetchedPerms);
      saveOfflinePermissions(fetchedPerms);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissoes(loadOfflinePermissions());
    } finally {
      setLoading(false);
    }
  }, [loadOfflinePermissions, saveOfflinePermissions]);

  // Initialize on mount
  useEffect(() => {
    setPermissoes(loadOfflinePermissions());
    fetchPermissoes();
  }, [fetchPermissoes, loadOfflinePermissions]);

  // Get permissions for a specific role
  const getPermissoesByRole = useCallback((role: string): PermissaoModulo[] => {
    return permissoes.filter(p => p.role === role);
  }, [permissoes]);

  // Check if a role can access a module
  const canAccess = useCallback((role: string, modulo: Modulo): boolean => {
    const perm = permissoes.find(p => p.role === role && p.modulo === modulo);
    return perm?.pode_visualizar ?? false;
  }, [permissoes]);

  // Check if a role can edit a module
  const canEdit = useCallback((role: string, modulo: Modulo): boolean => {
    const perm = permissoes.find(p => p.role === role && p.modulo === modulo);
    return perm?.pode_editar ?? false;
  }, [permissoes]);

  // Check if a role can delete in a module
  const canDelete = useCallback((role: string, modulo: Modulo): boolean => {
    const perm = permissoes.find(p => p.role === role && p.modulo === modulo);
    return perm?.pode_excluir ?? false;
  }, [permissoes]);

  // Update a permission
  const updatePermissao = useCallback(async (
    role: string,
    modulo: Modulo,
    updates: Partial<Pick<PermissaoModulo, 'pode_visualizar' | 'pode_editar' | 'pode_excluir'>>
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('permissoes_modulos')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('role', role)
        .eq('modulo', modulo);

      if (error) throw error;

      // Update local state
      setPermissoes(prev => prev.map(p => 
        p.role === role && p.modulo === modulo
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      ));

      toast.success('Permissão atualizada');
      return true;
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Batch update permissions for a role
  const updateRolePermissions = useCallback(async (
    role: string,
    modulosUpdates: Array<{ modulo: Modulo; pode_visualizar: boolean; pode_editar: boolean; pode_excluir: boolean }>
  ): Promise<boolean> => {
    setSaving(true);
    try {
      for (const update of modulosUpdates) {
        const { error } = await supabase
          .from('permissoes_modulos')
          .update({
            pode_visualizar: update.pode_visualizar,
            pode_editar: update.pode_editar,
            pode_excluir: update.pode_excluir,
            updated_at: new Date().toISOString(),
          })
          .eq('role', role)
          .eq('modulo', update.modulo);

        if (error) throw error;
      }

      await fetchPermissoes();
      toast.success('Permissões atualizadas');
      return true;
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Erro ao atualizar permissões');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchPermissoes]);

  return {
    permissoes,
    loading,
    saving,
    fetchPermissoes,
    getPermissoesByRole,
    canAccess,
    canEdit,
    canDelete,
    updatePermissao,
    updateRolePermissions,
    MODULOS_CONFIG,
  };
}
