-- Create sequence for comanda numbers
CREATE SEQUENCE public.comanda_numero_seq START 1;

-- Create atendimentos table
CREATE TABLE public.atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_comanda INTEGER NOT NULL UNIQUE DEFAULT nextval('comanda_numero_seq'),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_final DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT atendimento_status_valido CHECK (status IN ('aberto', 'fechado', 'cancelado'))
);

-- Create atendimento_servicos table
CREATE TABLE public.atendimento_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  comissao_percentual DECIMAL(5,2) NOT NULL,
  comissao_valor DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create atendimento_produtos table
CREATE TABLE public.atendimento_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pagamentos table
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pagamento_forma_valida CHECK (forma_pagamento IN ('dinheiro', 'debito', 'credito', 'pix', 'outros'))
);

-- Enable RLS
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS policies for atendimentos
CREATE POLICY "Permitir leitura de atendimentos" ON public.atendimentos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de atendimentos" ON public.atendimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de atendimentos" ON public.atendimentos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de atendimentos" ON public.atendimentos FOR DELETE USING (true);

-- RLS policies for atendimento_servicos
CREATE POLICY "Permitir leitura de atendimento_servicos" ON public.atendimento_servicos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de atendimento_servicos" ON public.atendimento_servicos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de atendimento_servicos" ON public.atendimento_servicos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de atendimento_servicos" ON public.atendimento_servicos FOR DELETE USING (true);

-- RLS policies for atendimento_produtos
CREATE POLICY "Permitir leitura de atendimento_produtos" ON public.atendimento_produtos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de atendimento_produtos" ON public.atendimento_produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de atendimento_produtos" ON public.atendimento_produtos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de atendimento_produtos" ON public.atendimento_produtos FOR DELETE USING (true);

-- RLS policies for pagamentos
CREATE POLICY "Permitir leitura de pagamentos" ON public.pagamentos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de pagamentos" ON public.pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de pagamentos" ON public.pagamentos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de pagamentos" ON public.pagamentos FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_atendimentos_updated_at BEFORE UPDATE ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_atendimentos_status ON public.atendimentos(status);
CREATE INDEX idx_atendimentos_data ON public.atendimentos(data_hora);
CREATE INDEX idx_atendimento_servicos_atendimento ON public.atendimento_servicos(atendimento_id);
CREATE INDEX idx_atendimento_produtos_atendimento ON public.atendimento_produtos(atendimento_id);
CREATE INDEX idx_pagamentos_atendimento ON public.pagamentos(atendimento_id);