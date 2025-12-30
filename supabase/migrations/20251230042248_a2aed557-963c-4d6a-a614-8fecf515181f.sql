-- Adicionar campos de configuração financeira na tabela de serviços
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS apenas_agenda boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS gera_receita boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS gera_comissao boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS aparece_pdv boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS tipo_servico text NOT NULL DEFAULT 'normal';

-- Adicionar check constraint para tipo_servico
ALTER TABLE public.servicos 
ADD CONSTRAINT servicos_tipo_servico_check 
CHECK (tipo_servico IN ('normal', 'cortesia', 'controle_interno'));

-- Comentários para documentação
COMMENT ON COLUMN public.servicos.apenas_agenda IS 'Se true, serviço aparece apenas na agenda sem contabilização financeira';
COMMENT ON COLUMN public.servicos.gera_receita IS 'Se true, lança no fluxo de caixa/financeiro';
COMMENT ON COLUMN public.servicos.gera_comissao IS 'Se true, calcula comissão para o profissional';
COMMENT ON COLUMN public.servicos.aparece_pdv IS 'Se true, aparece no PDV/Caixa para venda';
COMMENT ON COLUMN public.servicos.tipo_servico IS 'normal = contabiliza tudo, cortesia = não cobra, controle_interno = apenas agenda';