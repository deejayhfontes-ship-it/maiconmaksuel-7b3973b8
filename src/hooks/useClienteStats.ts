import { useMemo } from 'react';
import { subDays, parseISO, differenceInDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface Cliente {
  id: string;
  nome: string;
  celular: string;
  data_nascimento: string | null;
  created_at: string;
  ultima_visita: string | null;
  total_visitas: number;
  ativo: boolean;
}

interface Atendimento {
  id: string;
  cliente_id: string | null;
  data_hora: string;
  valor_final: number;
  status: string;
  cliente?: {
    nome: string;
    celular: string;
  };
}

interface DateRange {
  from: Date;
  to: Date;
}

// Status válidos para considerar como "visita concluída"
export const VALID_CLOSED_STATUSES = ['fechado', 'pago', 'concluido', 'finalizado'];

export interface ClienteComStats {
  id: string;
  nome: string;
  celular: string;
  email?: string | null;
  data_nascimento: string | null;
  created_at: string;
  ultima_visita_calculada: Date | null;
  total_visitas_calculado: number;
  total_gasto: number;
  ticket_medio: number;
  dias_ausente: number;
  // Propriedades de compatibilidade com código legado
  ultima_visita: string | null;
  total_visitas: number;
  totalGasto: number;
  visitas: number;
}

export interface ClienteStatsResult {
  // Dados processados
  clientesComStats: ClienteComStats[];
  
  // Relatórios prontos
  clientesNovos: ClienteComStats[];
  clientesAtivos: ClienteComStats[];
  clientesInativos: ClienteComStats[];
  clientesAusentes: ClienteComStats[];
  clientesMaisLucrativos: ClienteComStats[];
  aniversariantes: ClienteComStats[];
  
  // Métricas de diagnóstico
  diagnostico: {
    totalClientes: number;
    clientesComVisita: number;
    clientesSemVisita: number;
    clientesComNascimento: number;
    atendimentosFechados: number;
    ultimaAtualizacao: Date;
  };
}

interface UseClienteStatsParams {
  clientes: Cliente[];
  atendimentos: Atendimento[];
  dateRange: DateRange;
  diasAusencia?: number;
  diasAtividade?: number;
}

export function useClienteStats({
  clientes,
  atendimentos,
  dateRange,
  diasAusencia = 30,
  diasAtividade = 30,
}: UseClienteStatsParams): ClienteStatsResult {
  
  // Calcular estatísticas reais baseadas em atendimentos
  const clientesComStats = useMemo(() => {
    const hoje = new Date();
    
    // Filtrar atendimentos fechados
    const atendimentosFechados = atendimentos.filter(
      a => VALID_CLOSED_STATUSES.includes(a.status.toLowerCase())
    );
    
    // Agrupar atendimentos por cliente
    const statsPorCliente: Record<string, {
      ultimaVisita: Date | null;
      totalVisitas: number;
      totalGasto: number;
    }> = {};
    
    atendimentosFechados.forEach(a => {
      if (!a.cliente_id) return;
      
      if (!statsPorCliente[a.cliente_id]) {
        statsPorCliente[a.cliente_id] = {
          ultimaVisita: null,
          totalVisitas: 0,
          totalGasto: 0,
        };
      }
      
      const stats = statsPorCliente[a.cliente_id];
      const dataAtendimento = new Date(a.data_hora);
      
      if (!stats.ultimaVisita || dataAtendimento > stats.ultimaVisita) {
        stats.ultimaVisita = dataAtendimento;
      }
      
      stats.totalVisitas += 1;
      stats.totalGasto += a.valor_final || 0;
    });
    
    // Mapear clientes com suas estatísticas calculadas
    return clientes.filter(c => c.ativo).map(c => {
      const stats = statsPorCliente[c.id] || {
        ultimaVisita: null,
        totalVisitas: 0,
        totalGasto: 0,
      };
      
      // Usar última visita calculada OU a do banco (fallback)
      const ultimaVisitaCalculada = stats.ultimaVisita || 
        (c.ultima_visita ? new Date(c.ultima_visita) : null);
      
      // Usar total de visitas calculado OU do banco (fallback)
      const totalVisitasCalculado = stats.totalVisitas > 0 ? stats.totalVisitas : c.total_visitas;
      
      const diasAusenteCalc = ultimaVisitaCalculada 
        ? differenceInDays(hoje, ultimaVisitaCalculada) 
        : (totalVisitasCalculado > 0 ? 999 : -1); // -1 = nunca visitou
      
      return {
        id: c.id,
        nome: c.nome,
        celular: c.celular,
        email: (c as any).email || null,
        data_nascimento: c.data_nascimento,
        created_at: c.created_at,
        ultima_visita_calculada: ultimaVisitaCalculada,
        total_visitas_calculado: totalVisitasCalculado,
        total_gasto: stats.totalGasto,
        ticket_medio: totalVisitasCalculado > 0 ? stats.totalGasto / totalVisitasCalculado : 0,
        dias_ausente: diasAusenteCalc,
        // Propriedades de compatibilidade com código legado
        ultima_visita: ultimaVisitaCalculada ? ultimaVisitaCalculada.toISOString() : null,
        total_visitas: totalVisitasCalculado,
        totalGasto: stats.totalGasto,
        visitas: totalVisitasCalculado,
      };
    });
  }, [clientes, atendimentos]);
  
  // Clientes Novos: criados no período
  const clientesNovos = useMemo(() => {
    return clientesComStats.filter(c => {
      const createdAt = new Date(c.created_at);
      return isWithinInterval(createdAt, { 
        start: startOfDay(dateRange.from), 
        end: endOfDay(dateRange.to) 
      });
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [clientesComStats, dateRange]);
  
  // Clientes Ativos: última visita dentro de N dias
  const clientesAtivos = useMemo(() => {
    return clientesComStats.filter(c => {
      if (!c.ultima_visita_calculada) return false;
      return c.dias_ausente >= 0 && c.dias_ausente <= diasAtividade;
    }).sort((a, b) => a.dias_ausente - b.dias_ausente);
  }, [clientesComStats, diasAtividade]);
  
  // Clientes Inativos: última visita fora de N dias OU nunca visitou mas está cadastrado há mais de N dias
  // CORRIGIDO: Usar mesma lógica de diasAusencia para consistência com "Clientes Ausentes"
  const clientesInativos = useMemo(() => {
    return clientesComStats.filter(c => {
      // Se nunca visitou (sem histórico de atendimentos)
      if (!c.ultima_visita_calculada && c.total_visitas_calculado === 0) {
        // Considerar inativo se cadastrado há mais de diasAtividade dias
        const diasCadastro = differenceInDays(new Date(), new Date(c.created_at));
        return diasCadastro > diasAtividade;
      }
      // Se já visitou alguma vez, verificar se está inativo (última visita > diasAtividade dias)
      // Usar diasAtividade diretamente para consistência (não multiplicar por 2)
      return c.dias_ausente > diasAtividade;
    }).sort((a, b) => {
      // Ordenar: primeiro os que nunca visitaram, depois por dias ausente
      const aHasVisit = a.ultima_visita_calculada ? 1 : 0;
      const bHasVisit = b.ultima_visita_calculada ? 1 : 0;
      if (aHasVisit !== bHasVisit) return aHasVisit - bHasVisit; // sem visita primeiro
      return b.dias_ausente - a.dias_ausente;
    });
  }, [clientesComStats, diasAtividade]);
  
  // Clientes Ausentes: TEM histórico de visitas MAS última visita foi há X dias
  const clientesAusentes = useMemo(() => {
    return clientesComStats.filter(c => {
      // Deve ter pelo menos uma visita
      if (c.total_visitas_calculado === 0) return false;
      // Deve estar ausente há pelo menos X dias
      return c.dias_ausente >= diasAusencia;
    }).sort((a, b) => b.dias_ausente - a.dias_ausente);
  }, [clientesComStats, diasAusencia]);
  
  // Clientes Mais Lucrativos
  const clientesMaisLucrativos = useMemo(() => {
    return clientesComStats
      .filter(c => c.total_gasto > 0)
      .sort((a, b) => b.total_gasto - a.total_gasto)
      .slice(0, 50);
  }, [clientesComStats]);
  
  // Aniversariantes do período
  const aniversariantes = useMemo(() => {
    return clientesComStats.filter(c => {
      if (!c.data_nascimento) return false;
      const nascimento = parseISO(c.data_nascimento);
      const mesNascimento = nascimento.getMonth();
      const diaNascimento = nascimento.getDate();
      
      // Verificar se está no range de datas
      const from = dateRange.from;
      const to = dateRange.to;
      
      // Se o range é o mês atual, mostrar todos do mês
      if (from.getMonth() === to.getMonth()) {
        return mesNascimento === from.getMonth();
      }
      
      // Verificar dia/mês no range
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === mesNascimento && d.getDate() === diaNascimento) {
          return true;
        }
      }
      return false;
    }).sort((a, b) => {
      const diaA = parseISO(a.data_nascimento!).getDate();
      const diaB = parseISO(b.data_nascimento!).getDate();
      return diaA - diaB;
    });
  }, [clientesComStats, dateRange]);
  
  // Diagnóstico
  const diagnostico = useMemo(() => {
    const atendimentosFechados = atendimentos.filter(
      a => VALID_CLOSED_STATUSES.includes(a.status.toLowerCase())
    ).length;
    
    return {
      totalClientes: clientesComStats.length,
      clientesComVisita: clientesComStats.filter(c => c.total_visitas_calculado > 0).length,
      clientesSemVisita: clientesComStats.filter(c => c.total_visitas_calculado === 0).length,
      clientesComNascimento: clientesComStats.filter(c => c.data_nascimento !== null).length,
      atendimentosFechados,
      ultimaAtualizacao: new Date(),
    };
  }, [clientesComStats, atendimentos]);
  
  return {
    clientesComStats,
    clientesNovos,
    clientesAtivos,
    clientesInativos,
    clientesAusentes,
    clientesMaisLucrativos,
    aniversariantes,
    diagnostico,
  };
}
