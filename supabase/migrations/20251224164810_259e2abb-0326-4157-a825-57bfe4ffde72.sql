-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  celular TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  data_nascimento DATE,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_visita TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (sistema interno do salão)
CREATE POLICY "Permitir leitura de clientes" 
ON public.clientes 
FOR SELECT 
USING (true);

-- Política para inserção
CREATE POLICY "Permitir inserção de clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

-- Política para atualização
CREATE POLICY "Permitir atualização de clientes" 
ON public.clientes 
FOR UPDATE 
USING (true);

-- Política para exclusão
CREATE POLICY "Permitir exclusão de clientes" 
ON public.clientes 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para busca
CREATE INDEX idx_clientes_nome ON public.clientes USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_clientes_celular ON public.clientes(celular);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);