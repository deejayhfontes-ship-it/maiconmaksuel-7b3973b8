-- Adicionar campo sempre_emitir_nf na tabela clientes
ALTER TABLE public.clientes
ADD COLUMN sempre_emitir_nf BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campos de nota fiscal na tabela atendimentos
ALTER TABLE public.atendimentos
ADD COLUMN nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
ADD COLUMN nota_fiscal_solicitada BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campos de automação na tabela configuracoes_fiscal
ALTER TABLE public.configuracoes_fiscal
ADD COLUMN auto_emitir_cnpj BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN auto_emitir_cpf BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN auto_emitir_flag BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN valor_sugerir_emissao NUMERIC NOT NULL DEFAULT 500,
ADD COLUMN sugerir_emissao_marcado BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN comportamento_emissao TEXT NOT NULL DEFAULT 'aguardar',
ADD COLUMN dias_permitir_emissao INTEGER NOT NULL DEFAULT 5,
ADD COLUMN auto_enviar_email BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN auto_enviar_sms BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN notificar_erro_equipe BOOLEAN NOT NULL DEFAULT true;

-- Criar índice para busca de atendimentos sem nota fiscal
CREATE INDEX idx_atendimentos_nota_fiscal ON public.atendimentos(nota_fiscal_id) WHERE nota_fiscal_id IS NULL;