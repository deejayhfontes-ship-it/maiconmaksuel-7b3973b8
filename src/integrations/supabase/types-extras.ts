/**
 * types-extras.ts
 * Tipagem manual para tabelas não geradas automaticamente pelo Supabase CLI.
 * Complementa o types.ts gerado. Use estas interfaces no lugar de `any`.
 */

// ─────────────────────────────────────────────
// comissoes_registro
// ─────────────────────────────────────────────
export interface ComissaoRegistro {
  id: string;
  profissional_id: string;
  atendimento_id: string | null;
  servico_id: string | null;
  servico_nome: string | null;
  valor_servico: number;
  percentual: number;
  valor_comissao: number;
  status: 'pendente' | 'pago';
  data_pagamento: string | null;
  periodo_ref: string | null;
  fechamento_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// servico_comissao_profissional
// ─────────────────────────────────────────────
export interface ServicoComisProfissional {
  id: string;
  servico_id: string;
  profissional_id: string;
  percentual: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// fechamentos_semanais
// ─────────────────────────────────────────────
export type StatusFechamento = 'aberta' | 'fechada';

export interface FechamentoSemanalRow {
  id: string;
  data_inicio: string;
  data_fim: string;
  semana_numero: number;
  ano: number;
  status: StatusFechamento;
  total_faturamento: number;
  total_servicos: number;
  total_produtos_valor: number;
  total_comissoes: number;
  total_vales: number;
  total_liquido: number;
  observacoes: string | null;
  fechado_por: string | null;
  fechado_em: string | null;
  reaberto_por: string | null;
  reaberto_em: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// fechamentos_profissionais
// ─────────────────────────────────────────────
export type StatusPagamentoFechamento = 'pendente' | 'pago_parcial' | 'pago';

export interface FechamentoProfissionalRow {
  id: string;
  fechamento_semanal_id: string;
  profissional_id: string;
  total_atendimentos: number;
  total_faturamento: number;
  total_comissoes: number;
  total_vales: number;
  valor_liquido: number;
  /** Confirmação do profissional: 'pendente' | 'confirmado' */
  status: string;
  confirmado_por: string | null;
  confirmado_em: string | null;
  /** Pagamento financeiro */
  status_pagamento: StatusPagamentoFechamento;
  valor_pago: number;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Helpers — acesso ao supabase sem `any`
// ─────────────────────────────────────────────
import { supabase } from './client';

/**
 * Acessa tabelas extras (não tipadas no types.ts gerado)
 * sem precisar espalhar `as any` pelo código.
 *
 * Exemplo:
 *   const { data } = await dbExtras('comissoes_registro').select('*');
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dbExtras = (table: string) => (supabase as any).from(table);
