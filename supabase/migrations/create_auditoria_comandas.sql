-- ============================================================
-- AUDITORIA DE COMANDAS — Rodar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS atendimentos_auditoria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  uuid NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  numero_comanda  integer,
  acao            text NOT NULL,
  motivo          text NOT NULL,
  detalhes        jsonb,
  usuario_nome    text,
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_auditoria_atendimento ON atendimentos_auditoria(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created     ON atendimentos_auditoria(created_at DESC);

-- RLS: apenas leitura pública (se RLS ativo), escrita só pelo service_role
ALTER TABLE atendimentos_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir insert auditoria" ON atendimentos_auditoria
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir select auditoria" ON atendimentos_auditoria
  FOR SELECT USING (true);
