-- Tabela formal para histórico de pagamentos de comissão.
-- Antes era criada implicitamente pelo Supabase no primeiro insert,
-- sem constraints, tipos ou RLS.

CREATE TABLE IF NOT EXISTS pagamentos_comissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE RESTRICT,
  profissional_nome TEXT NOT NULL DEFAULT '',
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  valor_bruto DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_descontos DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_liquido DECIMAL(10,2) NOT NULL DEFAULT 0,
  qtd_itens INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  usuario_nome TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagcom_profissional ON pagamentos_comissao(profissional_id);
CREATE INDEX IF NOT EXISTS idx_pagcom_created ON pagamentos_comissao(created_at);

ALTER TABLE pagamentos_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagcom_select" ON pagamentos_comissao
  FOR SELECT USING (true);

CREATE POLICY "pagcom_insert" ON pagamentos_comissao
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pagcom_update" ON pagamentos_comissao
  FOR UPDATE USING (true) WITH CHECK (true);
