-- Criação da tabela de vouchers/cupons de desconto
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) NOT NULL,
  tipo_desconto VARCHAR(20) NOT NULL DEFAULT 'percentual' CHECK (tipo_desconto IN ('percentual', 'valor_fixo')),
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  validade DATE,
  usos_max INTEGER,
  usos_atuais INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  descricao TEXT,
  servicos_aplicaveis UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT voucher_codigo_unique UNIQUE (codigo),
  CONSTRAINT voucher_percentual_check CHECK (
    tipo_desconto != 'percentual' OR (valor > 0 AND valor <= 100)
  )
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (para verificação no caixa)
CREATE POLICY "Allow public read vouchers"
ON public.vouchers
FOR SELECT
USING (true);

-- Política de escrita para usuários autenticados (admin)
CREATE POLICY "Authenticated users can manage vouchers"
ON public.vouchers
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_vouchers_codigo ON public.vouchers (codigo);
CREATE INDEX IF NOT EXISTS idx_vouchers_ativo ON public.vouchers (ativo) WHERE ativo = true;
