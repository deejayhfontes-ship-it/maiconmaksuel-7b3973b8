-- Create agendamentos table
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT status_valido CHECK (status IN ('agendado', 'confirmado', 'atendido', 'cancelado', 'faltou'))
);

-- Enable RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura de agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de agendamentos" 
ON public.agendamentos 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_agendamentos_data_hora ON public.agendamentos(data_hora);
CREATE INDEX idx_agendamentos_profissional ON public.agendamentos(profissional_id);
CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);