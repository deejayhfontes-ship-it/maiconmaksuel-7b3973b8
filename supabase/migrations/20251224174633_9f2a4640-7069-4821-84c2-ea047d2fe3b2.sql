-- Tabela de contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  anexo_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contas a receber
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  atendimento_id UUID REFERENCES public.atendimentos(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- Policies for contas_pagar
CREATE POLICY "Permitir leitura de contas_pagar" ON public.contas_pagar FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de contas_pagar" ON public.contas_pagar FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de contas_pagar" ON public.contas_pagar FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de contas_pagar" ON public.contas_pagar FOR DELETE USING (true);

-- Policies for contas_receber
CREATE POLICY "Permitir leitura de contas_receber" ON public.contas_receber FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de contas_receber" ON public.contas_receber FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de contas_receber" ON public.contas_receber FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de contas_receber" ON public.contas_receber FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();