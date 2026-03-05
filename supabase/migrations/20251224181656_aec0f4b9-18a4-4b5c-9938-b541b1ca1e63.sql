-- Adicionar novas colunas na tabela profissionais
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS comissao_servicos numeric NOT NULL DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS comissao_produtos numeric NOT NULL DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS pode_vender_produtos boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS meta_servicos_mes numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_produtos_mes numeric NOT NULL DEFAULT 0;

-- Migrar dados da coluna antiga comissao_padrao para comissao_servicos
UPDATE public.profissionais SET comissao_servicos = comissao_padrao WHERE comissao_padrao IS NOT NULL;

-- Criar tabela para registrar vendas/faturamento do profissional por mês
CREATE TABLE IF NOT EXISTS public.profissional_metas_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  meta_servicos numeric NOT NULL DEFAULT 0,
  meta_produtos numeric NOT NULL DEFAULT 0,
  realizado_servicos numeric NOT NULL DEFAULT 0,
  realizado_produtos numeric NOT NULL DEFAULT 0,
  premio_servicos text,
  premio_produtos text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profissional_id, mes_referencia)
);

-- Enable RLS
ALTER TABLE public.profissional_metas_historico ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Permitir leitura de metas_historico" 
ON public.profissional_metas_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de metas_historico" 
ON public.profissional_metas_historico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de metas_historico" 
ON public.profissional_metas_historico 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de metas_historico" 
ON public.profissional_metas_historico 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_profissional_metas_historico_updated_at
BEFORE UPDATE ON public.profissional_metas_historico
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();