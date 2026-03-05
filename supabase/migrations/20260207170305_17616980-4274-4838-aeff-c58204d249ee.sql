-- Create enum for PIN-based access roles
CREATE TYPE public.pin_role AS ENUM ('admin', 'notebook', 'kiosk');

-- Create table for PIN access codes
CREATE TABLE public.pinos_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(4) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  role pin_role NOT NULL DEFAULT 'notebook',
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  CONSTRAINT pin_format CHECK (pin ~ '^\d{4}$'),
  CONSTRAINT pin_unique UNIQUE (pin)
);

-- Enable RLS
ALTER TABLE public.pinos_acesso ENABLE ROW LEVEL SECURITY;

-- Allow public read for PIN verification (only active PINs)
CREATE POLICY "Allow PIN verification"
ON public.pinos_acesso
FOR SELECT
USING (ativo = true);

-- Allow all operations for authenticated users (admin management)
CREATE POLICY "Authenticated users can manage PINs"
ON public.pinos_acesso
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_pinos_acesso_updated_at
BEFORE UPDATE ON public.pinos_acesso
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default PINs for each role
INSERT INTO public.pinos_acesso (pin, nome, role, descricao) VALUES
('0000', 'Administrador', 'admin', 'Acesso completo ao sistema'),
('1234', 'Atendente Notebook', 'notebook', 'Acesso à agenda e cadastros básicos'),
('9999', 'Terminal Kiosk', 'kiosk', 'Acesso ao caixa espelho, ponto e mini agenda');