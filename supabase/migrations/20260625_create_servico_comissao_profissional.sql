-- Tabela para definir comissão individual por serviço+profissional.
-- Nível 1 da hierarquia de prioridade do useGerarComissao:
--   1. servico_comissao_profissional.percentual  (ESTA TABELA)
--   2. servicos.comissao_padrao
--   3. profissionais.comissao_servicos

CREATE TABLE IF NOT EXISTS servico_comissao_profissional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  percentual DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(servico_id, profissional_id)
);

CREATE INDEX IF NOT EXISTS idx_scp_servico ON servico_comissao_profissional(servico_id);
CREATE INDEX IF NOT EXISTS idx_scp_profissional ON servico_comissao_profissional(profissional_id);

ALTER TABLE servico_comissao_profissional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scp_select" ON servico_comissao_profissional
  FOR SELECT USING (true);

CREATE POLICY "scp_insert" ON servico_comissao_profissional
  FOR INSERT WITH CHECK (true);

CREATE POLICY "scp_update" ON servico_comissao_profissional
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "scp_delete" ON servico_comissao_profissional
  FOR DELETE USING (true);
