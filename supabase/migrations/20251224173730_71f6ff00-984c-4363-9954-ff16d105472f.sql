-- Criar tabela de caixa
CREATE TABLE public.caixa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMP WITH TIME ZONE,
  valor_inicial NUMERIC NOT NULL DEFAULT 0,
  valor_final NUMERIC,
  valor_esperado NUMERIC,
  diferenca NUMERIC,
  status TEXT NOT NULL DEFAULT 'aberto',
  observacoes_abertura TEXT,
  observacoes_fechamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações do caixa
CREATE TABLE public.caixa_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID NOT NULL REFERENCES public.caixa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- entrada, saida, sangria, reforco
  categoria TEXT, -- venda, despesa, sangria, reforco, outros
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  forma_pagamento TEXT, -- dinheiro, debito, credito, pix, outros
  atendimento_id UUID REFERENCES public.atendimentos(id),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de despesas rápidas
CREATE TABLE public.despesas_rapidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID REFERENCES public.caixa(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL, -- cafe, transporte, lanche, material, limpeza, outros
  valor NUMERIC NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pago_por TEXT NOT NULL DEFAULT 'caixa', -- dinheiro, caixa
  observacoes TEXT
);

-- Enable RLS
ALTER TABLE public.caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_rapidas ENABLE ROW LEVEL SECURITY;

-- RLS policies for caixa
CREATE POLICY "Permitir leitura de caixa" ON public.caixa FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de caixa" ON public.caixa FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de caixa" ON public.caixa FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de caixa" ON public.caixa FOR DELETE USING (true);

-- RLS policies for caixa_movimentacoes
CREATE POLICY "Permitir leitura de movimentacoes" ON public.caixa_movimentacoes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de movimentacoes" ON public.caixa_movimentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de movimentacoes" ON public.caixa_movimentacoes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de movimentacoes" ON public.caixa_movimentacoes FOR DELETE USING (true);

-- RLS policies for despesas_rapidas
CREATE POLICY "Permitir leitura de despesas_rapidas" ON public.despesas_rapidas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de despesas_rapidas" ON public.despesas_rapidas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de despesas_rapidas" ON public.despesas_rapidas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de despesas_rapidas" ON public.despesas_rapidas FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_caixa_updated_at
BEFORE UPDATE ON public.caixa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();