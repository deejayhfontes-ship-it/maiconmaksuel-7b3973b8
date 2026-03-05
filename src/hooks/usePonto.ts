/**
 * Offline-first hook for employee time clock (Ponto Eletrônico)
 * Writes to `ponto_registros` table (the one FolhaPontoPanel reads)
 * Supports 4 event types: entrada, inicio_almoco, volta_almoco, saida
 *
 * Logging contract:
 *   [PONTO] submit_start / queued_offline / supabase_upsert_ok / supabase_upsert_fail
 *   [PONTO] blocked_missing_profissional_id / sync_flush_start / sync_flush_ok
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const syncingRef = useRef(false);

  const deviceId = getDeviceId();
  const hoje = format(new Date(), 'yyyy-MM-dd');

  // --- Online/Offline listeners ---
  useEffect(() => {
    const handleOnline = () => {
      console.log('[PONTO] network_online');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('[PONTO] network_offline');
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Load people ---
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
      console.error('[PONTO] load_pessoas_error', error);
    }
  }, [isOnline]);

  // --- Load today's records – always prefer Supabase when online ---
  const loadRegistrosHoje = useCallback(async () => {
    try {
      // Always load local for immediate display
      const localRegs = await localGetAll<PontoRegistroLocal>('registro_ponto');
      const hojeLocal = localRegs.filter((r) => r.data === hoje);

      if (isOnline) {
        // Authoritative source is Supabase
        const { data, error } = await supabase
          .from('ponto_registros')
          .select('*')
          .eq('data', hoje);

        if (error) {
          console.error('[PONTO] load_registros_supabase_error', error);
          // Fall back to local
          setRegistrosHoje(hojeLocal);
          return;
        }

        const dbRegistros: PontoRegistroLocal[] = [];
        for (const row of data || []) {
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

        // Merge: DB records + any unsynced local-only records
        const unsyncedLocal = hojeLocal.filter(r => !r._synced);
        const dbKeys = new Set(dbRegistros.map(r => `${r.pessoa_id}-${r.tipo_evento}`));
        const merged = [
          ...dbRegistros,
          ...unsyncedLocal.filter(r => !dbKeys.has(`${r.pessoa_id}-${r.tipo_evento}`)),
        ];
        setRegistrosHoje(merged);
        setLastSync(new Date());
      } else {
        setRegistrosHoje(hojeLocal);
      }
    } catch (error) {
      console.error('[PONTO] load_registros_error', error);
    }
  }, [hoje, isOnline]);

  // --- Check pending queue count ---
  const checkPending = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      const pontoOps = queue.filter((op) => op.entity === 'registro_ponto');
      setPendingCount(pontoOps.length);
    } catch { /* ignore */ }
  }, []);

  // --- Initial load ---
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

  // --- Dedicated ponto queue flush (NOT the generic sync) ---
  const processQueue = useCallback(async () => {
    if (!isOnline || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);

    console.log('[PONTO] sync_flush_start');
    try {
      const queue = await getSyncQueue();
      const pontoOps = queue.filter((op) => op.entity === 'registro_ponto');

      if (pontoOps.length === 0) {
        console.log('[PONTO] sync_flush_ok { pending: 0 }');
        syncingRef.current = false;
        setSyncing(false);
        return;
      }

      let ok = 0;
      let fail = 0;

      for (const op of pontoOps) {
        try {
          const d = op.data as unknown as PontoRegistroLocal;

          // Guard: never sync without pessoa_id
          if (!d.pessoa_id) {
            console.warn('[PONTO] sync_skip_missing_pessoa_id', { opId: op.id });
            await removeSyncOperation(op.id);
            fail++;
            continue;
          }

          const column = TIPO_TO_COLUMN[d.tipo_evento];
          const upsertPayload: Record<string, unknown> = {
            tipo_pessoa: d.tipo_pessoa,
            pessoa_id: d.pessoa_id,
            data: d.data,
            [column]: d.hora,
          };

          const { data: upsertResult, error } = await supabase
            .from('ponto_registros')
            .upsert(upsertPayload as any, { onConflict: 'tipo_pessoa,pessoa_id,data' })
            .select()
            .maybeSingle();

          if (!error) {
            console.log('[PONTO] supabase_upsert_ok (sync)', { id: upsertResult?.id, data: d.data, evento: d.tipo_evento });
            await removeSyncOperation(op.id);
            await localPut('registro_ponto', { ...d, _synced: true }, true);
            ok++;
          } else {
            console.error('[PONTO] supabase_upsert_fail (sync)', { error: error.message });
            fail++;
          }
        } catch (err: any) {
          console.error('[PONTO] sync_op_error', { error: err.message });
          fail++;
        }
      }

      console.log(`[PONTO] sync_flush_ok { ok: ${ok}, fail: ${fail} }`);

      if (fail > 0) {
        toast.error(`${fail} registro(s) de ponto falharam na sincronização`);
      }
      if (ok > 0) {
        toast.success(`${ok} registro(s) de ponto sincronizado(s)`);
      }

      await setMetadata('ponto_last_sync', new Date().toISOString());
      setLastSync(new Date());
      await checkPending();
      await loadRegistrosHoje();
    } catch (err) {
      console.error('[PONTO] sync_flush_error', err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isOnline, checkPending, loadRegistrosHoje]);

  // --- Auto-flush on online + periodic ---
  useEffect(() => {
    if (isOnline) {
      processQueue();
      const interval = setInterval(processQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, processQueue]);

  // --- Helpers ---
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

  // --- Main: register point ---
  const registrarPonto = useCallback(
    async (
      pessoaId: string,
      tipoPessoa: 'profissional' | 'funcionario',
      tipoEvento: TipoEvento,
      observacao?: string
    ): Promise<{ success: boolean; offline: boolean; error?: string }> => {

      const now = new Date();
      const tsLocal = now.toISOString();
      const tsUtc = now.toISOString(); // JS Date.toISOString() is always UTC

      // B) Validate profissional_id
      if (!pessoaId) {
        console.error('[PONTO] blocked_missing_profissional_id', { tipoPessoa, tipoEvento });
        toast.error('Erro: ID do profissional ausente. Não é possível registrar o ponto.');
        return { success: false, offline: false, error: 'profissional_id ausente' };
      }

      // A) Log submit_start
      const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0];
      console.log('[PONTO] upsert_start', { profissional_id: pessoaId, data_local: tsLocal, data_utc: tsUtc, tipoEvento, supabase_projectRef: projectRef });

      const validation = isAcaoValida(pessoaId, tipoEvento);
      if (!validation.valid) {
        toast.error(validation.reason || 'Ação inválida');
        return { success: false, offline: false, error: validation.reason };
      }

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
        created_at: tsUtc,
        _synced: false,
      };

      try {
        // Save locally first (offline-first)
        await localPut('registro_ponto', registro, false);
        setRegistrosHoje((prev) => [...prev, registro]);

        // Queue for sync
        await addToSyncQueue({
          entity: 'registro_ponto',
          operation: 'create',
          data: registro as unknown as Record<string, unknown>,
          timestamp: tsUtc,
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

          const { data: upsertResult, error } = await supabase
            .from('ponto_registros')
            .upsert(upsertData as any, { onConflict: 'tipo_pessoa,pessoa_id,data' })
            .select()
            .maybeSingle();

          if (error) {
            // A) Log failure
            console.error('[PONTO] upsert_fail', { error: error.message, code: error.code });
            toast.warning(`Sem internet: ponto salvo e será sincronizado`);
            await checkPending();
            return { success: true, offline: true };
          }

          // A) Log success
          console.log('[PONTO] upsert_ok', { id: upsertResult?.id, created_at: (upsertResult as any)?.created_at, updated_at: (upsertResult as any)?.updated_at, data, evento: tipoEvento, hora });

          // Mark synced
          await localPut('registro_ponto', { ...registro, _synced: true }, true);
          setRegistrosHoje((prev) =>
            prev.map((r) => (r.id === registro.id ? { ...r, _synced: true } : r))
          );

          // Remove from sync queue
          const queue = await getSyncQueue();
          const match = queue.find(q => (q.data as any)?.id === registro.id);
          if (match) await removeSyncOperation(match.id);

          toast.success(`✅ Ponto registrado online — ${TIPO_EVENTO_LABELS[tipoEvento]} às ${format(now, 'HH:mm')}`);
          await checkPending();
          return { success: true, offline: false };
        } else {
          // A) Log offline queue
          console.log('[PONTO] queued_offline', { localId: registro.id });
          toast.info(`Sem internet: ponto salvo e será sincronizado`);
          await checkPending();
          return { success: true, offline: true };
        }
      } catch (error: any) {
        console.error('[PONTO] supabase_upsert_fail', { error: error.message });
        toast.error(`Falha ao registrar ponto: ${error.message || 'Tente novamente'}`);
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
