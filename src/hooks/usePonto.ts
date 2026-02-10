/**
 * Offline-first hook for employee time clock (Ponto Eletrônico)
 * Writes to `ponto_registros` table (the one FolhaPontoPanel reads)
 * Supports 4 event types: entrada, inicio_almoco, volta_almoco, saida
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  localGetAll,
  localPut,
  addToSyncQueue,
  getSyncQueue,
  removeSyncOperation,
  setMetadata,
  getMetadata,
} from '@/lib/offlineDb';

export type TipoEvento = 'entrada' | 'inicio_almoco' | 'volta_almoco' | 'saida';

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  entrada: 'Entrada',
  inicio_almoco: 'Início Almoço',
  volta_almoco: 'Volta Almoço',
  saida: 'Saída',
};

// Maps tipo_evento to the column in ponto_registros
const TIPO_TO_COLUMN: Record<TipoEvento, string> = {
  entrada: 'entrada_manha',
  inicio_almoco: 'saida_almoco',
  volta_almoco: 'entrada_tarde',
  saida: 'saida',
};

export interface PontoRegistroLocal {
  id: string;
  tipo_pessoa: 'profissional' | 'funcionario';
  pessoa_id: string;
  tipo_evento: TipoEvento;
  hora: string; // HH:mm:ss
  data: string; // yyyy-MM-dd
  device_id: string;
  observacao?: string;
  created_at: string;
  _synced: boolean;
}

export interface Pessoa {
  id: string;
  nome: string;
  cargo_especialidade: string;
  tipo: 'profissional' | 'funcionario';
  foto_url?: string;
  ativo: boolean;
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem('mm-device-id');
  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem('mm-device-id', deviceId);
  }
  return deviceId;
}

export function usePonto() {
  const [registrosHoje, setRegistrosHoje] = useState<PontoRegistroLocal[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const deviceId = getDeviceId();
  const hoje = format(new Date(), 'yyyy-MM-dd');

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

  const loadPessoas = useCallback(async () => {
    try {
      if (isOnline) {
        const [funcRes, profRes] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, foto_url, ativo').eq('ativo', true),
          supabase.from('profissionais').select('id, nome, especialidade, foto_url, ativo').eq('ativo', true),
        ]);

        const funcionarios: Pessoa[] = (funcRes.data || []).map((f) => ({
          id: f.id, nome: f.nome, cargo_especialidade: f.cargo || 'Funcionário',
          tipo: 'funcionario' as const, foto_url: f.foto_url, ativo: f.ativo ?? true,
        }));

        const profissionais: Pessoa[] = (profRes.data || []).map((p) => ({
          id: p.id, nome: p.nome, cargo_especialidade: p.especialidade || 'Profissional',
          tipo: 'profissional' as const, foto_url: p.foto_url, ativo: p.ativo ?? true,
        }));

        setPessoas([...funcionarios, ...profissionais].sort((a, b) => a.nome.localeCompare(b.nome)));
      } else {
        const cached = await localGetAll<Pessoa>('profissionais');
        setPessoas(cached.filter(p => p.ativo));
      }
    } catch (error) {
      console.error('[Ponto] Erro ao carregar pessoas:', error);
    }
  }, [isOnline]);

  const loadRegistrosHoje = useCallback(async () => {
    try {
      // Local cache
      const localRegs = await localGetAll<PontoRegistroLocal>('registro_ponto');
      const hojeLocal = localRegs.filter((r) => r.data === hoje);
      setRegistrosHoje(hojeLocal);

      if (isOnline) {
        const { data, error } = await supabase
          .from('ponto_registros')
          .select('*')
          .eq('data', hoje);

        if (!error && data) {
          const dbRegistros: PontoRegistroLocal[] = [];
          for (const row of data) {
            const tipos: { col: string; evento: TipoEvento }[] = [
              { col: 'entrada_manha', evento: 'entrada' },
              { col: 'saida_almoco', evento: 'inicio_almoco' },
              { col: 'entrada_tarde', evento: 'volta_almoco' },
              { col: 'saida', evento: 'saida' },
            ];
            for (const t of tipos) {
              const val = (row as any)[t.col];
              if (val) {
                dbRegistros.push({
                  id: `${row.id}-${t.evento}`,
                  tipo_pessoa: row.tipo_pessoa as 'profissional' | 'funcionario',
                  pessoa_id: row.pessoa_id,
                  tipo_evento: t.evento,
                  hora: val,
                  data: row.data,
                  device_id: '',
                  created_at: row.created_at || new Date().toISOString(),
                  _synced: true,
                });
              }
            }
          }

          const unsyncedLocal = hojeLocal.filter(r => !r._synced);
          const dbKeys = new Set(dbRegistros.map(r => `${r.pessoa_id}-${r.tipo_evento}`));
          const merged = [
            ...dbRegistros,
            ...unsyncedLocal.filter(r => !dbKeys.has(`${r.pessoa_id}-${r.tipo_evento}`)),
          ];
          setRegistrosHoje(merged);
          setLastSync(new Date());
        }
      }
    } catch (error) {
      console.error('[Ponto] Erro ao carregar registros:', error);
    }
  }, [hoje, isOnline]);

  const checkPending = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      const pontoOps = queue.filter((op) => op.entity === 'registro_ponto');
      setPendingCount(pontoOps.length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPessoas(), loadRegistrosHoje(), checkPending()]);
      const lastSyncTime = await getMetadata('ponto_last_sync');
      if (lastSyncTime) setLastSync(new Date(lastSyncTime as string));
      setLoading(false);
    };
    init();
  }, [loadPessoas, loadRegistrosHoje, checkPending]);

  const processQueue = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const queue = await getSyncQueue();
      const pontoOps = queue.filter((op) => op.entity === 'registro_ponto');

      for (const op of pontoOps) {
        try {
          const d = op.data as unknown as PontoRegistroLocal;
          const column = TIPO_TO_COLUMN[d.tipo_evento];

          const { error } = await supabase
            .from('ponto_registros')
            .upsert(
              {
                tipo_pessoa: d.tipo_pessoa,
                pessoa_id: d.pessoa_id,
                data: d.data,
                [column]: d.hora,
              } as any,
              { onConflict: 'tipo_pessoa,pessoa_id,data' }
            );

          if (!error) {
            await removeSyncOperation(op.id);
            await localPut('registro_ponto', { ...d, _synced: true }, true);
          } else {
            console.error('[Ponto] Sync error:', error);
          }
        } catch (err) {
          console.error('[Ponto] Sync op error:', err);
        }
      }

      await setMetadata('ponto_last_sync', new Date().toISOString());
      setLastSync(new Date());
      await checkPending();
      await loadRegistrosHoje();
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, checkPending, loadRegistrosHoje]);

  useEffect(() => {
    if (isOnline) {
      processQueue();
      const interval = setInterval(processQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, processQueue]);

  const getRegistrosPessoa = useCallback(
    (pessoaId: string): PontoRegistroLocal[] => {
      return registrosHoje
        .filter((r) => r.pessoa_id === pessoaId)
        .sort((a, b) => {
          const order: TipoEvento[] = ['entrada', 'inicio_almoco', 'volta_almoco', 'saida'];
          return order.indexOf(a.tipo_evento) - order.indexOf(b.tipo_evento);
        });
    },
    [registrosHoje]
  );

  const getProximaAcao = useCallback(
    (pessoaId: string): TipoEvento => {
      const regs = getRegistrosPessoa(pessoaId);
      const done = new Set(regs.map(r => r.tipo_evento));
      if (!done.has('entrada')) return 'entrada';
      if (!done.has('inicio_almoco')) return 'inicio_almoco';
      if (!done.has('volta_almoco')) return 'volta_almoco';
      return 'saida';
    },
    [getRegistrosPessoa]
  );

  const isAcaoValida = useCallback(
    (pessoaId: string, tipo: TipoEvento): { valid: boolean; reason?: string } => {
      const regs = getRegistrosPessoa(pessoaId);
      const done = new Set(regs.map(r => r.tipo_evento));

      if (done.has(tipo)) return { valid: false, reason: `${TIPO_EVENTO_LABELS[tipo]} já registrada hoje` };

      switch (tipo) {
        case 'entrada': return { valid: true };
        case 'inicio_almoco':
          return done.has('entrada') ? { valid: true } : { valid: false, reason: 'Registre a Entrada primeiro' };
        case 'volta_almoco':
          return done.has('inicio_almoco') ? { valid: true } : { valid: false, reason: 'Registre o Início do Almoço primeiro' };
        case 'saida':
          return done.has('entrada') ? { valid: true } : { valid: false, reason: 'Registre a Entrada primeiro' };
        default: return { valid: false, reason: 'Ação desconhecida' };
      }
    },
    [getRegistrosPessoa]
  );

  const registrarPonto = useCallback(
    async (
      pessoaId: string,
      tipoPessoa: 'profissional' | 'funcionario',
      tipoEvento: TipoEvento,
      observacao?: string
    ): Promise<{ success: boolean; offline: boolean; error?: string }> => {
      const validation = isAcaoValida(pessoaId, tipoEvento);
      if (!validation.valid) {
        toast.error(validation.reason || 'Ação inválida');
        return { success: false, offline: false, error: validation.reason };
      }

      const now = new Date();
      const hora = format(now, 'HH:mm:ss');
      const data = format(now, 'yyyy-MM-dd');

      const registro: PontoRegistroLocal = {
        id: crypto.randomUUID(),
        tipo_pessoa: tipoPessoa,
        pessoa_id: pessoaId,
        tipo_evento: tipoEvento,
        hora, data,
        device_id: deviceId,
        observacao,
        created_at: now.toISOString(),
        _synced: false,
      };

      try {
        await localPut('registro_ponto', registro, false);
        setRegistrosHoje((prev) => [...prev, registro]);

        await addToSyncQueue({
          entity: 'registro_ponto',
          operation: 'create',
          data: registro as unknown as Record<string, unknown>,
          timestamp: now.toISOString(),
        });

        if (isOnline) {
          const column = TIPO_TO_COLUMN[tipoEvento];
          const upsertData: Record<string, unknown> = {
            tipo_pessoa: tipoPessoa,
            pessoa_id: pessoaId,
            data,
            [column]: hora,
          };
          if (observacao) upsertData.observacoes = observacao;

          const { error } = await supabase
            .from('ponto_registros')
            .upsert(upsertData as any, { onConflict: 'tipo_pessoa,pessoa_id,data' });

          if (error) {
            console.error('[Ponto] DB error:', error);
            toast.warning(`${TIPO_EVENTO_LABELS[tipoEvento]} salva offline — sincronizará ao reconectar`);
            await checkPending();
            return { success: true, offline: true };
          }

          await localPut('registro_ponto', { ...registro, _synced: true }, true);
          setRegistrosHoje((prev) =>
            prev.map((r) => (r.id === registro.id ? { ...r, _synced: true } : r))
          );

          const queue = await getSyncQueue();
          const match = queue.find(q => (q.data as any)?.id === registro.id);
          if (match) await removeSyncOperation(match.id);

          toast.success(`✅ ${TIPO_EVENTO_LABELS[tipoEvento]} registrada às ${format(now, 'HH:mm')}`);
          await checkPending();
          return { success: true, offline: false };
        } else {
          toast.info(`${TIPO_EVENTO_LABELS[tipoEvento]} salva offline — sincronizará ao reconectar`);
          await checkPending();
          return { success: true, offline: true };
        }
      } catch (error: any) {
        console.error('[Ponto] Erro:', error);
        toast.error(`Erro ao registrar ponto: ${error.message || 'Tente novamente'}`);
        return { success: false, offline: false, error: error.message };
      }
    },
    [deviceId, isOnline, isAcaoValida, checkPending]
  );

  return {
    registrosHoje,
    pessoas,
    loading,
    isOnline,
    lastSync,
    syncing,
    pendingCount,
    deviceId,
    registrarPonto,
    getProximaAcao,
    getRegistrosPessoa,
    isAcaoValida,
    processQueue,
    refresh: () => Promise.all([loadPessoas(), loadRegistrosHoje(), checkPending()]),
  };
}
