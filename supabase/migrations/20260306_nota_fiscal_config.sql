-- ============================================================
-- MÓDULO NOTA FISCAL ELETRÔNICA (NF-e / NFC-e)
-- Configurações fiscais da empresa + campos extras notas_fiscais
-- ============================================================

-- 1. Tabela: Configurações Fiscais da Empresa (Emitente)
CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados da empresa
  cnpj VARCHAR(14) NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  cnae VARCHAR(10),
  crt VARCHAR(1) DEFAULT '1', -- 1=SN, 2=SN Excesso, 3=Normal
  
  -- Endereço
  cep VARCHAR(8),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  codigo_municipio VARCHAR(7), -- Código IBGE
  municipio VARCHAR(100),
  uf VARCHAR(2),
  telefone VARCHAR(15),
  
  -- Configurações de emissão
  ambiente VARCHAR(1) DEFAULT '2', -- 1=Produção, 2=Homologação
  serie_nfe INTEGER DEFAULT 1,
  serie_nfce INTEGER DEFAULT 1,
  proximo_numero_nfe INTEGER DEFAULT 1,
  proximo_numero_nfce INTEGER DEFAULT 1,
  
  -- CSC (NFC-e)
  csc TEXT,
  csc_id VARCHAR(10),
  
  -- Responsável Técnico
  resp_cnpj VARCHAR(14),
  resp_contato VARCHAR(100),
  resp_email VARCHAR(100),
  resp_fone VARCHAR(15),
  
  -- Certificado Digital
  certificado_path TEXT, -- Caminho no Supabase Storage
  certificado_senha_hash TEXT, -- Senha criptografada
  certificado_validade TIMESTAMPTZ,
  certificado_nome VARCHAR(255),
  certificado_status VARCHAR(20) DEFAULT 'nao_configurado', -- valido, expirado, nao_configurado
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar campos extras na tabela notas_fiscais (se existir)
DO $$
BEGIN
  -- XML de envio (assinado)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'xml_envio') THEN
    ALTER TABLE notas_fiscais ADD COLUMN xml_envio TEXT;
  END IF;
  
  -- XML de retorno da SEFAZ
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'xml_retorno') THEN
    ALTER TABLE notas_fiscais ADD COLUMN xml_retorno TEXT;
  END IF;
  
  -- XML de cancelamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'xml_cancelamento') THEN
    ALTER TABLE notas_fiscais ADD COLUMN xml_cancelamento TEXT;
  END IF;
  
  -- XML de carta de correção
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'xml_carta_correcao') THEN
    ALTER TABLE notas_fiscais ADD COLUMN xml_carta_correcao TEXT;
  END IF;
  
  -- Número do protocolo de autorização
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'numero_protocolo') THEN
    ALTER TABLE notas_fiscais ADD COLUMN numero_protocolo VARCHAR(50);
  END IF;
  
  -- Motivo cancelamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'motivo_cancelamento') THEN
    ALTER TABLE notas_fiscais ADD COLUMN motivo_cancelamento TEXT;
  END IF;
  
  -- Texto carta de correção
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'texto_carta_correcao') THEN
    ALTER TABLE notas_fiscais ADD COLUMN texto_carta_correcao TEXT;
  END IF;
  
  -- Sequencial carta de correção (pode ter até 20)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'seq_carta_correcao') THEN
    ALTER TABLE notas_fiscais ADD COLUMN seq_carta_correcao INTEGER DEFAULT 0;
  END IF;
  
  -- DANFE PDF path no storage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notas_fiscais' AND column_name = 'danfe_pdf_path') THEN
    ALTER TABLE notas_fiscais ADD COLUMN danfe_pdf_path TEXT;
  END IF;
END
$$;

-- 3. Tabela: Itens da Nota Fiscal (detalhamento de cada produto/serviço)
CREATE TABLE IF NOT EXISTS notas_fiscais_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  
  -- Produto
  numero_item INTEGER NOT NULL,
  codigo_produto VARCHAR(60),
  descricao VARCHAR(120) NOT NULL,
  ncm VARCHAR(8),
  cfop VARCHAR(4),
  unidade VARCHAR(6) DEFAULT 'UNID',
  quantidade DECIMAL(15,4) DEFAULT 1,
  valor_unitario DECIMAL(15,10) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  -- Impostos
  cst_icms VARCHAR(3),
  csosn VARCHAR(3),
  origem VARCHAR(1) DEFAULT '0', -- 0=Nacional
  base_icms DECIMAL(15,2) DEFAULT 0,
  aliquota_icms DECIMAL(5,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  cst_pis VARCHAR(2),
  valor_pis DECIMAL(15,2) DEFAULT 0,
  cst_cofins VARCHAR(2),
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela: Eventos da Nota Fiscal (cancelamentos, correções, manifestações)
CREATE TABLE IF NOT EXISTS notas_fiscais_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  
  tipo_evento VARCHAR(10) NOT NULL, -- 110111=Cancelamento, 110110=CCe, 210200=Confirmação, etc
  descricao VARCHAR(100),
  sequencial INTEGER DEFAULT 1,
  protocolo VARCHAR(50),
  data_evento TIMESTAMPTZ DEFAULT now(),
  justificativa TEXT,
  xml_evento TEXT,
  xml_retorno TEXT,
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, processado, rejeitado
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela: Numeração Inutilizada
CREATE TABLE IF NOT EXISTS notas_fiscais_inutilizadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  modelo VARCHAR(2) NOT NULL, -- 55 ou 65
  serie INTEGER NOT NULL,
  numero_inicial INTEGER NOT NULL,
  numero_final INTEGER NOT NULL,
  justificativa TEXT NOT NULL,
  protocolo VARCHAR(50),
  xml_retorno TEXT,
  data_inutilizacao TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, processado, rejeitado
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS Policies
ALTER TABLE configuracoes_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_inutilizadas ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (auth do sistema via PIN)
CREATE POLICY "Allow all on configuracoes_fiscais" ON configuracoes_fiscais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notas_fiscais_itens" ON notas_fiscais_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notas_fiscais_eventos" ON notas_fiscais_eventos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notas_fiscais_inutilizadas" ON notas_fiscais_inutilizadas FOR ALL USING (true) WITH CHECK (true);

-- 7. Storage bucket para certificados e XMLs
-- (precisa ser criado via Dashboard ou API separada)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('fiscal', 'fiscal', false);
