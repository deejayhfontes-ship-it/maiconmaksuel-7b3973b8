-- Create servicos table
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  preco DECIMAL(10,2) NOT NULL,
  comissao_padrao DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura de servicos" 
ON public.servicos 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de servicos" 
ON public.servicos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de servicos" 
ON public.servicos 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de servicos" 
ON public.servicos 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_servicos_updated_at
BEFORE UPDATE ON public.servicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();