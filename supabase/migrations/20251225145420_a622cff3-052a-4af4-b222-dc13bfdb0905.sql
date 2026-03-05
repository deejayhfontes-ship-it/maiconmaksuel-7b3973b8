-- Tabela de configurações fiscais
CREATE TABLE public.configuracoes_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_razao_social TEXT NOT NULL,
  empresa_nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_uf TEXT,
  endereco_cep TEXT,
  telefone TEXT,
  email TEXT,
  regime_tributario TEXT NOT NULL DEFAULT 'simples_nacional',
  certificado_digital_path TEXT,
  certificado_senha TEXT,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  serie_nfe INTEGER NOT NULL DEFAULT 1,
  numero_proximo_nfe INTEGER NOT NULL DEFAULT 1,
  serie_nfce INTEGER NOT NULL DEFAULT 1,
  numero_proximo_nfce INTEGER NOT NULL DEFAULT 1,
  api_provider TEXT DEFAULT 'focus_nfe',
  api_token TEXT,
  cfop_servicos TEXT DEFAULT '5933',
  cfop_produtos TEXT DEFAULT '5102',
  aliquota_iss NUMERIC DEFAULT 3.00,
  aliquota_icms NUMERIC DEFAULT 0,
  observacoes_padrao TEXT,
  emissao_automatica BOOLEAN DEFAULT false,
  tipo_emissao_automatica TEXT DEFAULT 'nfce',
  envio_email_automatico BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notas fiscais
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('nfe', 'nfce', 'nfse')),
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  chave_acesso TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'processando', 'autorizada', 'cancelada', 'rejeitada')),
  motivo_rejeicao TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  cliente_endereco TEXT,
  atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE SET NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_servicos NUMERIC DEFAULT 0,
  valor_produtos NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  base_calculo_icms NUMERIC DEFAULT 0,
  valor_icms NUMERIC DEFAULT 0,
  base_calculo_iss NUMERIC DEFAULT 0,
  valor_iss NUMERIC DEFAULT 0,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  data_cancelamento TIMESTAMP WITH TIME ZONE,
  protocolo TEXT,
  xml_path TEXT,
  pdf_path TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da nota fiscal
CREATE TABLE public.itens_nota_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('servico', 'produto')),
  codigo TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT NOT NULL,
  unidade TEXT DEFAULT 'UN',
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  valor_desconto NUMERIC DEFAULT 0,
  aliquota_icms NUMERIC DEFAULT 0,
  aliquota_iss NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_nota_fiscal ENABLE ROW LEVEL SECURITY;

-- Policies for configuracoes_fiscal
CREATE POLICY "Permitir leitura de configuracoes_fiscal" ON public.configuracoes_fiscal FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de configuracoes_fiscal" ON public.configuracoes_fiscal FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de configuracoes_fiscal" ON public.configuracoes_fiscal FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de configuracoes_fiscal" ON public.configuracoes_fiscal FOR DELETE USING (true);

-- Policies for notas_fiscais
CREATE POLICY "Permitir leitura de notas_fiscais" ON public.notas_fiscais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de notas_fiscais" ON public.notas_fiscais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de notas_fiscais" ON public.notas_fiscais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de notas_fiscais" ON public.notas_fiscais FOR DELETE USING (true);

-- Policies for itens_nota_fiscal
CREATE POLICY "Permitir leitura de itens_nota_fiscal" ON public.itens_nota_fiscal FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de itens_nota_fiscal" ON public.itens_nota_fiscal FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de itens_nota_fiscal" ON public.itens_nota_fiscal FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de itens_nota_fiscal" ON public.itens_nota_fiscal FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_configuracoes_fiscal_updated_at
  BEFORE UPDATE ON public.configuracoes_fiscal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX idx_notas_fiscais_tipo ON public.notas_fiscais(tipo);
CREATE INDEX idx_notas_fiscais_data_emissao ON public.notas_fiscais(data_emissao);
CREATE INDEX idx_notas_fiscais_cliente_id ON public.notas_fiscais(cliente_id);
CREATE INDEX idx_notas_fiscais_atendimento_id ON public.notas_fiscais(atendimento_id);
CREATE INDEX idx_itens_nota_fiscal_nota_id ON public.itens_nota_fiscal(nota_fiscal_id);