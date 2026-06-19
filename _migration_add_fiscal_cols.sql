-- =====================================================
-- Migration: Adicionar colunas fiscais à tabela produtos
-- Data: 2026-06-12
-- =====================================================

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm TEXT DEFAULT '00000000',
  ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS cst_icms TEXT DEFAULT '00',
  ADD COLUMN IF NOT EXISTS csosn TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';

-- Verificar se criou corretamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'produtos'
  AND column_name IN ('ncm', 'cfop', 'cst_icms', 'csosn', 'cest', 'origem')
ORDER BY ordinal_position;
