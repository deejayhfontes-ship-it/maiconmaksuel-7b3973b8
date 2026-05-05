-- ===========================================================================
-- CORREÇÃO FINAL DEFINITIVA — Comissões, Caixa e Fechamento
-- Data: 2026-05-05
-- ===========================================================================

-- 1) TABELA DE AUDITORIA FINANCEIRA
-- Registra TODOS os eventos financeiros relevantes para rastreabilidade
CREATE TABLE IF NOT EXISTS public.comissao_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id UUID REFERENCES public.atendimentos(id),
  profissional_id UUID REFERENCES public.profissionais(id),
  tipo_evento TEXT NOT NULL,
  valor_anterior NUMERIC(10,2),
  valor_novo NUMERIC(10,2),
  subtotal_itens NUMERIC(10,2),
  desconto NUMERIC(10,2),
  origem TEXT NOT NULL DEFAULT 'sistema',
  mensagem TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_atendimento ON public.comissao_auditoria(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo ON public.comissao_auditoria(tipo_evento);

-- 2) LIMPAR DUPLICATAS EXISTENTES antes de criar constraint
-- Mantém apenas a comissão mais recente para cada (atendimento, profissional, servico) ativa
DELETE FROM comissoes_registro
WHERE id NOT IN (
  SELECT DISTINCT ON (atendimento_id, profissional_id, COALESCE(servico_id, '00000000-0000-0000-0000-000000000000'))
    id
  FROM comissoes_registro
  WHERE status NOT IN ('cancelado', 'estornado')
  ORDER BY atendimento_id, profissional_id, COALESCE(servico_id, '00000000-0000-0000-0000-000000000000'), created_at DESC
)
AND status NOT IN ('cancelado', 'estornado');

-- 3) ÍNDICE ÚNICO PARCIAL — impede comissão duplicada no banco
-- Permite múltiplos registros cancelados/estornados, mas apenas UM ativo
DROP INDEX IF EXISTS idx_comissao_unica_ativa;
CREATE UNIQUE INDEX idx_comissao_unica_ativa
ON public.comissoes_registro (
  atendimento_id,
  profissional_id,
  COALESCE(servico_id, '00000000-0000-0000-0000-000000000000')
)
WHERE status NOT IN ('cancelado', 'estornado');

-- 4) TRIGGER DE GUARDA ATUALIZADO — registra auditoria em vez de corrigir silenciosamente
CREATE OR REPLACE FUNCTION public.validar_fechamento_atendimento()
RETURNS TRIGGER AS $$
DECLARE
  v_total_itens NUMERIC;
  v_valor_anterior NUMERIC;
BEGIN
  -- Só valida quando status muda para 'fechado' ou 'finalizado'
  IF NEW.status IN ('fechado', 'finalizado')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('fechado', 'finalizado')) THEN

    -- Calcular soma real dos itens (serviços + produtos)
    SELECT COALESCE(
      (SELECT SUM(subtotal) FROM public.atendimento_servicos WHERE atendimento_id = NEW.id), 0
    ) + COALESCE(
      (SELECT SUM(subtotal) FROM public.atendimento_produtos WHERE atendimento_id = NEW.id), 0
    ) INTO v_total_itens;

    -- Se existem itens mas valor_final está zerado ou nulo
    IF v_total_itens > 0 AND (NEW.valor_final IS NULL OR NEW.valor_final <= 0) THEN
      v_valor_anterior := COALESCE(OLD.valor_final, 0);

      -- Corrigir automaticamente
      NEW.subtotal := v_total_itens;
      NEW.valor_final := GREATEST(0, v_total_itens - COALESCE(NEW.desconto, 0));

      -- REGISTRAR NA AUDITORIA (não mais silencioso)
      INSERT INTO public.comissao_auditoria (
        atendimento_id, tipo_evento, valor_anterior, valor_novo,
        subtotal_itens, desconto, origem, mensagem
      ) VALUES (
        NEW.id,
        'valor_final_corrigido_por_trigger',
        v_valor_anterior,
        NEW.valor_final,
        v_total_itens,
        COALESCE(NEW.desconto, 0),
        'trigger_guard',
        format('GUARD: valor_final corrigido de %s para %s (itens=%s, desconto=%s)',
          v_valor_anterior, NEW.valor_final, v_total_itens, COALESCE(NEW.desconto, 0))
      );
    END IF;

    -- Corrigir subtotal também se necessário
    IF v_total_itens > 0 AND (NEW.subtotal IS NULL OR NEW.subtotal <= 0) THEN
      NEW.subtotal := v_total_itens;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validar_fechamento ON public.atendimentos;
CREATE TRIGGER trg_validar_fechamento
BEFORE UPDATE ON public.atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.validar_fechamento_atendimento();
