-- Create produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo_barras TEXT UNIQUE,
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2) NOT NULL,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 5,
  categoria TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura de produtos" 
ON public.produtos 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de produtos" 
ON public.produtos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de produtos" 
ON public.produtos 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de produtos" 
ON public.produtos 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();