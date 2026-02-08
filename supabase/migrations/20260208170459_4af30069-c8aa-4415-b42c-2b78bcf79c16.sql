-- Create RH configuration table
CREATE TABLE IF NOT EXISTS public.configuracoes_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_padrao_horas NUMERIC NOT NULL DEFAULT 8,
  tolerancia_atraso_minutos INTEGER NOT NULL DEFAULT 15,
  tolerancia_saida_minutos INTEGER NOT NULL DEFAULT 15,
  intervalo_minimo_minutos INTEGER NOT NULL DEFAULT 60,
  habilitar_banco_horas BOOLEAN NOT NULL DEFAULT false,
  habilitar_horas_extras BOOLEAN NOT NULL DEFAULT true,
  percentual_hora_extra NUMERIC NOT NULL DEFAULT 50,
  regra_comissao_base TEXT NOT NULL DEFAULT 'liquido', -- 'bruto' ou 'liquido'
  arredondamento_comissao TEXT NOT NULL DEFAULT 'normal', -- 'baixo', 'cima', 'normal'
  fechamento_automatico BOOLEAN NOT NULL DEFAULT false,
  dia_fechamento INTEGER NOT NULL DEFAULT 25,
  modo_kiosk_apenas_batida BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_rh ENABLE ROW LEVEL SECURITY;

-- RLS policies for configuracoes_rh
CREATE POLICY "Allow read for authenticated users" ON public.configuracoes_rh
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for admins" ON public.configuracoes_rh
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create RH reports history table
CREATE TABLE IF NOT EXISTS public.rh_relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'folha_ponto', 'comissoes', 'pagamentos', 'funcionarios'
  subtipo TEXT,
  periodo_inicio DATE,
  periodo_fim DATE,
  funcionario_id UUID REFERENCES public.funcionarios(id),
  profissional_id UUID REFERENCES public.profissionais(id),
  filtros JSONB DEFAULT '{}',
  totais JSONB DEFAULT '{}',
  url_pdf TEXT,
  criado_por TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rh_relatorios ENABLE ROW LEVEL SECURITY;

-- RLS policies for rh_relatorios
CREATE POLICY "Allow read for authenticated users" ON public.rh_relatorios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.rh_relatorios
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create commissions table
CREATE TABLE IF NOT EXISTS public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  atendimento_id UUID REFERENCES public.atendimentos(id),
  atendimento_servico_id UUID REFERENCES public.atendimento_servicos(id),
  atendimento_produto_id UUID REFERENCES public.atendimento_produtos(id),
  tipo TEXT NOT NULL DEFAULT 'servico', -- 'servico', 'produto'
  descricao TEXT,
  valor_base NUMERIC NOT NULL DEFAULT 0,
  percentual_comissao NUMERIC NOT NULL DEFAULT 0,
  valor_comissao NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovada', 'paga'
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comissoes
CREATE POLICY "Allow read for authenticated users" ON public.comissoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON public.comissoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create folha_ponto_mensal table for monthly time sheets
CREATE TABLE IF NOT EXISTS public.folha_ponto_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL, -- 'funcionario', 'profissional'
  pessoa_id UUID NOT NULL,
  mes_referencia DATE NOT NULL,
  total_horas_trabalhadas NUMERIC NOT NULL DEFAULT 0,
  total_horas_extras NUMERIC NOT NULL DEFAULT 0,
  total_atrasos_minutos INTEGER NOT NULL DEFAULT 0,
  total_faltas INTEGER NOT NULL DEFAULT 0,
  dias_trabalhados INTEGER NOT NULL DEFAULT 0,
  banco_horas_saldo NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberta', -- 'aberta', 'fechada', 'reaberta'
  fechada_em TIMESTAMPTZ,
  fechada_por TEXT,
  reaberta_em TIMESTAMPTZ,
  reaberta_por TEXT,
  motivo_reabertura TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_pessoa, pessoa_id, mes_referencia)
);

-- Enable RLS
ALTER TABLE public.folha_ponto_mensal ENABLE ROW LEVEL SECURITY;

-- RLS policies for folha_ponto_mensal
CREATE POLICY "Allow read for authenticated users" ON public.folha_ponto_mensal
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON public.folha_ponto_mensal
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create payments record table
CREATE TABLE IF NOT EXISTS public.pagamentos_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL, -- 'funcionario', 'profissional'
  pessoa_id UUID NOT NULL,
  tipo_pagamento TEXT NOT NULL, -- 'salario', 'comissao', 'vale', 'adiantamento', 'bonus'
  mes_referencia DATE,
  valor_bruto NUMERIC NOT NULL DEFAULT 0,
  valor_descontos NUMERIC NOT NULL DEFAULT 0,
  valor_liquido NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'pago'
  data_pagamento TIMESTAMPTZ,
  comprovante_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pagamentos_rh ENABLE ROW LEVEL SECURITY;

-- RLS policies for pagamentos_rh
CREATE POLICY "Allow read for authenticated users" ON public.pagamentos_rh
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON public.pagamentos_rh
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create storage bucket for RH reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('relatorios-rh', 'relatorios-rh', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for relatorios-rh bucket
CREATE POLICY "Public read access for rh reports" ON storage.objects
  FOR SELECT USING (bucket_id = 'relatorios-rh');

CREATE POLICY "Authenticated users can upload rh reports" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'relatorios-rh');

-- Insert default RH config if not exists
INSERT INTO public.configuracoes_rh (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Add triggers for updated_at
CREATE TRIGGER update_configuracoes_rh_updated_at
  BEFORE UPDATE ON public.configuracoes_rh
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folha_ponto_mensal_updated_at
  BEFORE UPDATE ON public.folha_ponto_mensal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pagamentos_rh_updated_at
  BEFORE UPDATE ON public.pagamentos_rh
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();