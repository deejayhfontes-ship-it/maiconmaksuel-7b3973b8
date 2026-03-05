-- Tabela de funcionários (administrativos)
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  foto_url TEXT,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco_completo TEXT,
  cep TEXT,
  cargo TEXT NOT NULL DEFAULT 'outro',
  cargo_customizado TEXT,
  departamento TEXT DEFAULT 'administrativo',
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  tipo_contrato TEXT NOT NULL DEFAULT 'clt',
  salario_base NUMERIC NOT NULL,
  vale_transporte NUMERIC DEFAULT 0,
  vale_refeicao NUMERIC DEFAULT 0,
  plano_saude NUMERIC DEFAULT 0,
  outros_beneficios JSONB DEFAULT '[]'::jsonb,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT DEFAULT 'corrente',
  pix_chave TEXT,
  pix_tipo TEXT,
  jornada_entrada TIME DEFAULT '08:00',
  jornada_saida_almoco TIME DEFAULT '12:00',
  jornada_entrada_tarde TIME DEFAULT '13:00',
  jornada_saida TIME DEFAULT '18:00',
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de folhas de pagamento
CREATE TABLE public.folhas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  valor_total_bruto NUMERIC DEFAULT 0,
  valor_total_liquido NUMERIC DEFAULT 0,
  valor_total_descontos NUMERIC DEFAULT 0,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da folha de pagamento
CREATE TABLE public.itens_folha_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_pagamento_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  salario_base NUMERIC NOT NULL,
  horas_extras NUMERIC DEFAULT 0,
  valor_horas_extras NUMERIC DEFAULT 0,
  adicional_noturno NUMERIC DEFAULT 0,
  comissoes NUMERIC DEFAULT 0,
  vale_transporte NUMERIC DEFAULT 0,
  vale_refeicao NUMERIC DEFAULT 0,
  plano_saude NUMERIC DEFAULT 0,
  outros_proventos NUMERIC DEFAULT 0,
  inss NUMERIC DEFAULT 0,
  irrf NUMERIC DEFAULT 0,
  outros_descontos NUMERIC DEFAULT 0,
  faltas INTEGER DEFAULT 0,
  desconto_faltas NUMERIC DEFAULT 0,
  total_proventos NUMERIC DEFAULT 0,
  total_descontos NUMERIC DEFAULT 0,
  salario_liquido NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ponto dos funcionários
CREATE TABLE public.ponto_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada_manha TIME,
  saida_almoco TIME,
  entrada_tarde TIME,
  saida TIME,
  horas_trabalhadas NUMERIC DEFAULT 0,
  horas_extras NUMERIC DEFAULT 0,
  falta BOOLEAN DEFAULT false,
  justificada BOOLEAN DEFAULT false,
  justificativa TEXT,
  atestado_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, data)
);

-- Tabela de férias dos funcionários
CREATE TABLE public.ferias_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  dias_direito INTEGER DEFAULT 30,
  dias_gozados INTEGER DEFAULT 0,
  data_inicio_ferias DATE,
  data_fim_ferias DATE,
  valor_ferias NUMERIC DEFAULT 0,
  terco_constitucional NUMERIC DEFAULT 0,
  abono_pecuniario BOOLEAN DEFAULT false,
  dias_abono INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'programadas',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de documentos dos funcionários
CREATE TABLE public.documentos_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ocorrências dos funcionários
CREATE TABLE public.ocorrencias_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  gravidade TEXT DEFAULT 'leve',
  data_ocorrencia DATE NOT NULL,
  descricao TEXT NOT NULL,
  medidas_tomadas TEXT,
  anexos_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_folha_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias_funcionarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies para funcionarios
CREATE POLICY "Permitir leitura de funcionarios" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de funcionarios" ON public.funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de funcionarios" ON public.funcionarios FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de funcionarios" ON public.funcionarios FOR DELETE USING (true);

-- RLS Policies para folhas_pagamento
CREATE POLICY "Permitir leitura de folhas_pagamento" ON public.folhas_pagamento FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de folhas_pagamento" ON public.folhas_pagamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de folhas_pagamento" ON public.folhas_pagamento FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de folhas_pagamento" ON public.folhas_pagamento FOR DELETE USING (true);

-- RLS Policies para itens_folha_pagamento
CREATE POLICY "Permitir leitura de itens_folha" ON public.itens_folha_pagamento FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de itens_folha" ON public.itens_folha_pagamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de itens_folha" ON public.itens_folha_pagamento FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de itens_folha" ON public.itens_folha_pagamento FOR DELETE USING (true);

-- RLS Policies para ponto_funcionarios
CREATE POLICY "Permitir leitura de ponto" ON public.ponto_funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de ponto" ON public.ponto_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de ponto" ON public.ponto_funcionarios FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de ponto" ON public.ponto_funcionarios FOR DELETE USING (true);

-- RLS Policies para ferias_funcionarios
CREATE POLICY "Permitir leitura de ferias" ON public.ferias_funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de ferias" ON public.ferias_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de ferias" ON public.ferias_funcionarios FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de ferias" ON public.ferias_funcionarios FOR DELETE USING (true);

-- RLS Policies para documentos_funcionarios
CREATE POLICY "Permitir leitura de documentos" ON public.documentos_funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de documentos" ON public.documentos_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de documentos" ON public.documentos_funcionarios FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de documentos" ON public.documentos_funcionarios FOR DELETE USING (true);

-- RLS Policies para ocorrencias_funcionarios
CREATE POLICY "Permitir leitura de ocorrencias" ON public.ocorrencias_funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de ocorrencias" ON public.ocorrencias_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de ocorrencias" ON public.ocorrencias_funcionarios FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de ocorrencias" ON public.ocorrencias_funcionarios FOR DELETE USING (true);

-- Storage bucket para documentos de funcionários
INSERT INTO storage.buckets (id, name, public) VALUES ('funcionarios-docs', 'funcionarios-docs', true)
ON CONFLICT (id) DO NOTHING;