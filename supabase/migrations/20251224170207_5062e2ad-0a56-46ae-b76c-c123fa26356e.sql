-- Create profissionais table
CREATE TABLE public.profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  data_admissao DATE,
  comissao_padrao DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  cor_agenda TEXT NOT NULL DEFAULT '#3b82f6',
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura de profissionais" 
ON public.profissionais 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de profissionais" 
ON public.profissionais 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de profissionais" 
ON public.profissionais 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de profissionais" 
ON public.profissionais 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_profissionais_updated_at
BEFORE UPDATE ON public.profissionais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();