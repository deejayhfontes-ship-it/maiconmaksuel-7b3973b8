-- ============================================
-- Fase 1: Comissões Automáticas + Estoque Completo
-- ============================================

-- 1. COMISSÕES - Configuração por profissional/serviço
CREATE TABLE IF NOT EXISTS comissoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL,
  servico_id UUID,
  percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  tipo VARCHAR(20) DEFAULT 'servico',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profissional_id, servico_id)
);

-- 2. COMISSÕES - Registro de cada comissão gerada
CREATE TABLE IF NOT EXISTS comissoes_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL,
  atendimento_id UUID,
  servico_id UUID,
  valor_servico DECIMAL(10,2) NOT NULL DEFAULT 0,
  percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  valor_comissao DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente',
  data_pagamento TIMESTAMPTZ,
  periodo_ref VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ESTOQUE - Movimentações
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER DEFAULT 0,
  quantidade_posterior INTEGER DEFAULT 0,
  motivo TEXT,
  referencia_id UUID,
  referencia_tipo VARCHAR(30),
  usuario_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comissoes_registro_profissional ON comissoes_registro(profissional_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_registro_status ON comissoes_registro(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_registro_created ON comissoes_registro(created_at);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_produto ON estoque_movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo ON estoque_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created ON estoque_movimentacoes(created_at);

-- RLS
ALTER TABLE comissoes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Policies (acesso total autenticado)
CREATE POLICY "comissoes_config_all" ON comissoes_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "comissoes_registro_all" ON comissoes_registro FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "estoque_movimentacoes_all" ON estoque_movimentacoes FOR ALL USING (true) WITH CHECK (true);
