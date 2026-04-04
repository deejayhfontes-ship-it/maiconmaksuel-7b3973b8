-- ============================================================
-- UPGRADE AUDITORIA DE COMANDAS — Snapshots Completos
-- Executar no Supabase SQL Editor do projeto:
-- https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/sql/new
-- ============================================================

-- 1. Criar a tabela base se ainda não existir (idempotente)
CREATE TABLE IF NOT EXISTS atendimentos_auditoria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  uuid NOT NULL,
  numero_comanda  integer,
  acao            text NOT NULL,
  motivo          text NOT NULL,
  detalhes        jsonb,
  usuario_nome    text,
  created_at      timestamptz DEFAULT now()
);

-- 2. Adicionar novas colunas (idempotentes via IF NOT EXISTS)
ALTER TABLE atendimentos_auditoria
  ADD COLUMN IF NOT EXISTS motivo_categoria  text,
  ADD COLUMN IF NOT EXISTS status_anterior   text,
  ADD COLUMN IF NOT EXISTS status_novo       text,
  ADD COLUMN IF NOT EXISTS snapshot_antes    jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_depois   jsonb,
  ADD COLUMN IF NOT EXISTS usuario_id        text;

-- 3. Comentários para documentação
COMMENT ON COLUMN atendimentos_auditoria.snapshot_antes
  IS 'Estado completo da comanda ANTES da ação (atendimento + itens + pagamentos)';
COMMENT ON COLUMN atendimentos_auditoria.snapshot_depois
  IS 'Estado completo da comanda DEPOIS da ação (preenchido ao fechar novamente)';
COMMENT ON COLUMN atendimentos_auditoria.status_anterior
  IS 'Status da comanda antes da alteração (aberto, finalizado, cancelado, reaberta)';
COMMENT ON COLUMN atendimentos_auditoria.status_novo
  IS 'Novo status após a alteração';
COMMENT ON COLUMN atendimentos_auditoria.motivo_categoria
  IS 'Categoria estruturada do motivo: erro_lancamento, solicitacao_cliente, correcao_financeira, outro';
COMMENT ON COLUMN atendimentos_auditoria.usuario_id
  IS 'ID do profissional/usuário que realizou a ação (do localStorage)';

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_auditoria_atendimento ON atendimentos_auditoria(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created     ON atendimentos_auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao        ON atendimentos_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_categoria   ON atendimentos_auditoria(motivo_categoria);

-- 5. RLS — habilitar segurança em nível de linha
ALTER TABLE atendimentos_auditoria ENABLE ROW LEVEL SECURITY;

-- 6. Policies — INSERT e SELECT livres para usuários autenticados
DO $$
BEGIN
  -- Policy INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimentos_auditoria'
    AND policyname = 'Permitir insert auditoria'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir insert auditoria" ON atendimentos_auditoria FOR INSERT WITH CHECK (true)';
  END IF;

  -- Policy SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimentos_auditoria'
    AND policyname = 'Permitir select auditoria'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir select auditoria" ON atendimentos_auditoria FOR SELECT USING (true)';
  END IF;

  -- Bloquear UPDATE (registros são imutáveis)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimentos_auditoria'
    AND policyname = 'Bloquear update auditoria'
  ) THEN
    EXECUTE 'CREATE POLICY "Bloquear update auditoria" ON atendimentos_auditoria FOR UPDATE USING (false)';
  END IF;

  -- Bloquear DELETE (registros são imutáveis)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimentos_auditoria'
    AND policyname = 'Bloquear delete auditoria'
  ) THEN
    EXECUTE 'CREATE POLICY "Bloquear delete auditoria" ON atendimentos_auditoria FOR DELETE USING (false)';
  END IF;
END $$;

-- 7. Verificação final
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'atendimentos_auditoria'
ORDER BY ordinal_position;
