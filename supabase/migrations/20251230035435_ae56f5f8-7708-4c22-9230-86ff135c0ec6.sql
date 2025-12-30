-- Criar tabela de gorjetas
CREATE TABLE public.gorjetas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  repassada BOOLEAN NOT NULL DEFAULT false,
  data_repasse DATE,
  forma_repasse TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de dívidas/fiados
CREATE TABLE public.dividas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE SET NULL,
  valor_original NUMERIC NOT NULL,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL,
  data_origem DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pagamentos de dívidas
CREATE TABLE public.dividas_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  divida_id UUID NOT NULL REFERENCES public.dividas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  forma_pagamento TEXT NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  desconto NUMERIC DEFAULT 0,
  juros NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.gorjetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividas_pagamentos ENABLE ROW LEVEL SECURITY;

-- Policies para gorjetas
CREATE POLICY "Permitir leitura de gorjetas" ON public.gorjetas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de gorjetas" ON public.gorjetas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de gorjetas" ON public.gorjetas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de gorjetas" ON public.gorjetas FOR DELETE USING (true);

-- Policies para dividas
CREATE POLICY "Permitir leitura de dividas" ON public.dividas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de dividas" ON public.dividas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de dividas" ON public.dividas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de dividas" ON public.dividas FOR DELETE USING (true);

-- Policies para dividas_pagamentos
CREATE POLICY "Permitir leitura de dividas_pagamentos" ON public.dividas_pagamentos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de dividas_pagamentos" ON public.dividas_pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de dividas_pagamentos" ON public.dividas_pagamentos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de dividas_pagamentos" ON public.dividas_pagamentos FOR DELETE USING (true);

-- Trigger para atualizar updated_at em dividas
CREATE TRIGGER update_dividas_updated_at
  BEFORE UPDATE ON public.dividas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();