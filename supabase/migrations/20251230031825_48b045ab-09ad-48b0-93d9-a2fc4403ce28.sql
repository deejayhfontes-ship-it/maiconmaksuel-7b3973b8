
-- Criar tabela de fechamentos semanais
CREATE TABLE public.fechamentos_semanais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  semana_numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'reaberta')),
  total_faturamento NUMERIC(10,2) DEFAULT 0,
  total_servicos INTEGER DEFAULT 0,
  total_produtos_valor NUMERIC(10,2) DEFAULT 0,
  total_comissoes NUMERIC(10,2) DEFAULT 0,
  total_vales NUMERIC(10,2) DEFAULT 0,
  total_liquido NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  fechado_por UUID,
  fechado_em TIMESTAMP WITH TIME ZONE,
  reaberto_por UUID,
  reaberto_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de fechamentos por profissional
CREATE TABLE public.fechamentos_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_semanal_id UUID NOT NULL REFERENCES public.fechamentos_semanais(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  total_atendimentos INTEGER DEFAULT 0,
  total_faturamento NUMERIC(10,2) DEFAULT 0,
  total_comissoes NUMERIC(10,2) DEFAULT 0,
  total_vales NUMERIC(10,2) DEFAULT 0,
  valor_liquido NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'pago')),
  confirmado_por UUID,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de metas
CREATE TABLE public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  periodo_tipo TEXT NOT NULL DEFAULT 'mensal' CHECK (periodo_tipo IN ('mensal', 'trimestral', 'anual', 'personalizado')),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  mes INTEGER,
  ano INTEGER NOT NULL,
  valor_meta NUMERIC(10,2) NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'R$',
  calculo_automatico BOOLEAN DEFAULT false,
  percentual_crescimento NUMERIC(5,2) DEFAULT 0,
  responsavel_id UUID,
  alerta_50 BOOLEAN DEFAULT true,
  alerta_75 BOOLEAN DEFAULT true,
  alerta_atraso BOOLEAN DEFAULT true,
  alerta_100 BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de progresso das metas
CREATE TABLE public.metas_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_id UUID NOT NULL REFERENCES public.metas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor_atual NUMERIC(10,2) DEFAULT 0,
  percentual NUMERIC(5,2) DEFAULT 0,
  projecao_final NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fechamentos_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_progresso ENABLE ROW LEVEL SECURITY;

-- RLS policies for fechamentos_semanais
CREATE POLICY "Permitir leitura de fechamentos_semanais" ON public.fechamentos_semanais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de fechamentos_semanais" ON public.fechamentos_semanais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de fechamentos_semanais" ON public.fechamentos_semanais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de fechamentos_semanais" ON public.fechamentos_semanais FOR DELETE USING (true);

-- RLS policies for fechamentos_profissionais
CREATE POLICY "Permitir leitura de fechamentos_profissionais" ON public.fechamentos_profissionais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de fechamentos_profissionais" ON public.fechamentos_profissionais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de fechamentos_profissionais" ON public.fechamentos_profissionais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de fechamentos_profissionais" ON public.fechamentos_profissionais FOR DELETE USING (true);

-- RLS policies for metas
CREATE POLICY "Permitir leitura de metas" ON public.metas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de metas" ON public.metas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de metas" ON public.metas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de metas" ON public.metas FOR DELETE USING (true);

-- RLS policies for metas_progresso
CREATE POLICY "Permitir leitura de metas_progresso" ON public.metas_progresso FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de metas_progresso" ON public.metas_progresso FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de metas_progresso" ON public.metas_progresso FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de metas_progresso" ON public.metas_progresso FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_fechamentos_semanais_updated_at
  BEFORE UPDATE ON public.fechamentos_semanais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for week
CREATE UNIQUE INDEX idx_fechamentos_semanais_unique ON public.fechamentos_semanais(semana_numero, ano);
CREATE UNIQUE INDEX idx_fechamentos_profissionais_unique ON public.fechamentos_profissionais(fechamento_semanal_id, profissional_id);
