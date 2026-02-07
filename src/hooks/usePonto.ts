/**
 * Offline-first hook for employee time clock (Ponto Eletrônico)
 * Kiosk-only module for recording entrada/saída timestamps
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  localGetAll,
  localPut,
  addToSyncQueue,
  localBulkPut,
  getSyncQueue,
  removeSyncOperation,
  setMetadata,
  getMetadata,
} from '@/lib/offlineDb';

export interface PontoRegistro {
  id: string;
  profissional_id?: string;
  funcionario_id?: string;
  tipo_pessoa: 'profissional' | 'funcionario';
  pessoa_id: string;
  tipo: 'entrada' | 'saida';
  timestamp: string;
  device_id: string;
  observacao?: string;
  foto_comprovante?: string;
  created_at: string;
  _synced?: boolean;
}

export interface Pessoa {
  id: string;
  nome: string;
  cargo_especialidade: string;
  tipo: 'profissional' | 'funcionario';
  foto_url?: string;
  ativo: boolean;
}

// Generate or retrieve device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem('mm-device-id');
  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem('mm-device-id', deviceId);
  }
  return deviceId;
}

export function usePonto() {
  const [registros, setRegistros] = useState<PontoRegistro[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const deviceId = getDeviceId();
  const hoje = format(new Date(), 'yyyy-MM-dd');

  // Monitor online status
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

  // Load pessoas (funcionários + profissionais)
  const loadPessoas = useCallback(async () => {
    try {
      // Try local first
      const localFunc = await localGetAll<Pessoa & { tipo: 'funcionario' }>('profissionais');
      const localProf = await localGetAll<Pessoa & { tipo: 'profissional' }>('profissionais');
      
      if (isOnline) {
        const [funcRes, profRes] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, foto_url, ativo').eq('ativo', true),
          supabase.from('profissionais').select('id, nome, especialidade, foto_url, ativo').eq('ativo', true),
        ]);

        const funcionarios: Pessoa[] = (funcRes.data || []).map((f) => ({
          id: f.id,
          nome: f.nome,
          cargo_especialidade: f.cargo || 'Funcionário',
          tipo: 'funcionario' as const,
          foto_url: f.foto_url,
          ativo: f.ativo ?? true,
        }));

        const profissionais: Pessoa[] = (profRes.data || []).map((p) => ({
          id: p.id,
          nome: p.nome,
          cargo_especialidade: p.especialidade || 'Profissional',
          tipo: 'profissional' as const,
          foto_url: p.foto_url,
          ativo: p.ativo ?? true,
        }));

        const allPessoas = [...funcionarios, ...profissionais].sort((a, b) => 
          a.nome.localeCompare(b.nome)
        );
        setPessoas(allPessoas);
      } else {
        // Use cached data
        const cachedPessoas = [...localFunc, ...localProf].filter(p => p.ativo);
        setPessoas(cachedPessoas);
      }
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    }
  }, [isOnline]);

  // Load today's registros
  const loadRegistrosHoje = useCallback(async () => {
    try {
      // Local first
      const localRegistros = await localGetAll<PontoRegistro>('registro_ponto');
      const hojeRegistros = localRegistros.filter((r) =>
        r.timestamp.startsWith(hoje)
      );
      setRegistros(hojeRegistros);

      if (isOnline) {
        const { data, error } = await supabase
          .from('registro_ponto')
          .select('*')
          .gte('timestamp', `${hoje}T00:00:00`)
          .lte('timestamp', `${hoje}T23:59:59`);

        if (!error && data) {
          const mapped: PontoRegistro[] = data.map((r) => ({
            id: r.id,
            profissional_id: r.profissional_id,
            tipo_pessoa: r.profissional_id ? 'profissional' : 'funcionario',
            pessoa_id: r.profissional_id || '',
            tipo: r.tipo as 'entrada' | 'saida',
            timestamp: r.timestamp,
            device_id: '',
            observacao: r.observacao || undefined,
            foto_comprovante: r.foto_comprovante || undefined,
            created_at: r.created_at,
          }));

          // Merge with local unsynced
          const unsynced = hojeRegistros.filter((r) => !r._synced);
          const serverIds = new Set(mapped.map((r) => r.id));
          const merged = [...mapped, ...unsynced.filter((r) => !serverIds.has(r.id))];

          await localBulkPut('registro_ponto', merged);
          setRegistros(merged);
          setLastSync(new Date());
        }
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    }
  }, [hoje, isOnline]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPessoas(), loadRegistrosHoje()]);
      
      const lastSyncTime = await getMetadata('ponto_last_sync');
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime as string));
      }
      
      setLoading(false);
    };
    init();
  }, [loadPessoas, loadRegistrosHoje]);

  // Sync queue processing
  const processQueue = useCallback(async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      const queue = await getSyncQueue();
      const pontoOps = queue.filter((op) => op.entity === 'registro_ponto');

      for (const op of pontoOps) {
        try {
          if (op.operation === 'create') {
            const data = op.data as unknown as PontoRegistro;
            const { error } = await supabase.from('registro_ponto').insert({
              id: data.id,
              profissional_id: data.tipo_pessoa === 'profissional' ? data.pessoa_id : null,
              tipo: data.tipo,
              timestamp: data.timestamp,
              observacao: data.observacao || null,
              foto_comprovante: data.foto_comprovante || null,
            });

            if (!error) {
              await removeSyncOperation(op.id);
              await localPut('registro_ponto', { ...data, _synced: true }, true);
            }
          }
        } catch (err) {
          console.error('Erro ao sincronizar operação:', err);
        }
      }

      await setMetadata('ponto_last_sync', new Date().toISOString());
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline) {
      processQueue();
      const interval = setInterval(processQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, processQueue]);

  // Get last registro for a pessoa today
  const getUltimoRegistro = useCallback(
    (pessoaId: string, tipoPessoa: 'profissional' | 'funcionario'): PontoRegistro | null => {
      const pessoaRegistros = registros
        .filter((r) => r.pessoa_id === pessoaId && r.tipo_pessoa === tipoPessoa)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return pessoaRegistros[0] || null;
    },
    [registros]
  );

  // Get expected next action for a pessoa
  const getProximaAcao = useCallback(
    (pessoaId: string, tipoPessoa: 'profissional' | 'funcionario'): 'entrada' | 'saida' => {
      const ultimo = getUltimoRegistro(pessoaId, tipoPessoa);
      if (!ultimo) return 'entrada';
      return ultimo.tipo === 'entrada' ? 'saida' : 'entrada';
    },
    [getUltimoRegistro]
  );

  // Register ponto
  const registrarPonto = useCallback(
    async (
      pessoaId: string,
      tipoPessoa: 'profissional' | 'funcionario',
      tipo: 'entrada' | 'saida',
      observacao?: string
    ): Promise<boolean> => {
      const now = new Date();
      const registro: PontoRegistro = {
        id: crypto.randomUUID(),
        tipo_pessoa: tipoPessoa,
        pessoa_id: pessoaId,
        tipo,
        timestamp: now.toISOString(),
        device_id: deviceId,
        observacao,
        created_at: now.toISOString(),
        _synced: false,
      };

      try {
        // Save locally first
        await localPut('registro_ponto', registro, false);
        setRegistros((prev) => [...prev, registro]);

        // Add to sync queue
        await addToSyncQueue({
          entity: 'registro_ponto',
          operation: 'create',
          data: registro as unknown as Record<string, unknown>,
          timestamp: now.toISOString(),
        });

        // Try immediate sync if online
        if (isOnline) {
          const { error } = await supabase.from('registro_ponto').insert({
            id: registro.id,
            profissional_id: tipoPessoa === 'profissional' ? pessoaId : null,
            tipo: registro.tipo,
            timestamp: registro.timestamp,
            observacao: registro.observacao || null,
          });

          if (!error) {
            await localPut('registro_ponto', { ...registro, _synced: true }, true);
            setRegistros((prev) =>
              prev.map((r) => (r.id === registro.id ? { ...r, _synced: true } : r))
            );
          }
        }

        const hora = format(now, 'HH:mm');
        toast.success(`✅ ${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada às ${hora}`);
        return true;
      } catch (error) {
        console.error('Erro ao registrar ponto:', error);
        toast.error('Erro ao registrar ponto. Tente novamente.');
        return false;
      }
    },
    [deviceId, isOnline]
  );

  // Get all registros for a pessoa today
  const getRegistrosPessoa = useCallback(
    (pessoaId: string, tipoPessoa: 'profissional' | 'funcionario'): PontoRegistro[] => {
      return registros
        .filter((r) => r.pessoa_id === pessoaId && r.tipo_pessoa === tipoPessoa)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    [registros]
  );

  return {
    registros,
    pessoas,
    loading,
    isOnline,
    lastSync,
    syncing,
    deviceId,
    registrarPonto,
    getUltimoRegistro,
    getProximaAcao,
    getRegistrosPessoa,
    refresh: () => Promise.all([loadPessoas(), loadRegistrosHoje()]),
  };
}
