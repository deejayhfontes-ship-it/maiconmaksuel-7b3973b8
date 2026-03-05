-- Adicionar campos de crediário à tabela de clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS elegivel_crediario BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS limite_crediario DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_vencimento_crediario INTEGER DEFAULT 10;

-- Adicionar campo para notificações de vencimento
ALTER TABLE public.dividas 
ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_ultima_notificacao TIMESTAMP WITH TIME ZONE;