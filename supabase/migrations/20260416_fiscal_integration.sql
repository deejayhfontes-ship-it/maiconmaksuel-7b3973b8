-- ============================================================
-- MIGRATION: Integração Fiscal Completa (NF-e / NFC-e / NFS-e)
-- Baseada em auditoria do sistema
-- ============================================================

-- ============================================================
-- 1. PRODUTOS — Campos fiscais faltando
-- ============================================================
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) DEFAULT '00000000';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest VARCHAR(7);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3) DEFAULT '00';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS csosn VARCHAR(4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop VARCHAR(4) DEFAULT '5102';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem VARCHAR(1) DEFAULT '0';

-- ============================================================
-- 2. SERVIÇOS — Código LC 116 para NFS-e
-- ============================================================
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS codigo_servico_lc116 VARCHAR(10);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS codigo_cnae VARCHAR(10);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC(5,2) DEFAULT 3.00;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) DEFAULT '00000000';

-- ============================================================
-- 3. CONFIGURACOES_FISCAL — Campos NFS-e faltando
-- ============================================================
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS serie_nfse INTEGER DEFAULT 1;
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS numero_proximo_nfse INTEGER DEFAULT 1;
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS numero_rps INTEGER DEFAULT 1;
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(7);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS cnae VARCHAR(10);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS csc VARCHAR(100);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS csc_id VARCHAR(10);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS resp_tecnico_cnpj VARCHAR(18);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS resp_tecnico_contato VARCHAR(100);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS resp_tecnico_email VARCHAR(100);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS resp_tecnico_telefone VARCHAR(20);
ALTER TABLE configuracoes_fiscal ADD COLUMN IF NOT EXISTS certificado_validade TIMESTAMPTZ;

-- ============================================================
-- 4. NOTAS_FISCAIS — Campos para provider e contingência
-- ============================================================
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS contingencia BOOLEAN DEFAULT false;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS codigo_rejeicao VARCHAR(10);
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS tentativas_envio INTEGER DEFAULT 0;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS ultimo_envio TIMESTAMPTZ;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS provider_ref VARCHAR(100);
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS numero_rps INTEGER;

-- ============================================================
-- 5. FISCAL_LOGS — Log estruturado de rejeições SEFAZ
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  acao VARCHAR(50) NOT NULL,
  tipo_documento VARCHAR(10) DEFAULT 'nfce',
  codigo_retorno VARCHAR(10),
  mensagem_retorno TEXT,
  xml_envio TEXT,
  xml_retorno TEXT,
  provider VARCHAR(50) DEFAULT 'focus_nfe',
  ambiente VARCHAR(1) DEFAULT '2',
  tentativa INTEGER DEFAULT 1,
  duracao_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE fiscal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_logs_select_auth"
  ON fiscal_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "fiscal_logs_insert_service"
  ON fiscal_logs FOR INSERT TO service_role WITH CHECK (true);

-- Permitir insert de qualquer usuário autenticado também (edge function usa service_role, mas frontend pode precisar)
CREATE POLICY "fiscal_logs_insert_auth"
  ON fiscal_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_nota ON fiscal_logs(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_created ON fiscal_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_acao ON fiscal_logs(acao);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_provider_ref ON notas_fiscais(provider_ref);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status);

-- ============================================================
-- 6. Remover tabela log_sefaz antiga se existir (substituída por fiscal_logs)
-- ============================================================
DROP TABLE IF EXISTS log_sefaz;
