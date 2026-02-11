
-- Add lembrete_enviado column to agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS lembrete_enviado boolean NOT NULL DEFAULT false;

-- Add index for the cron query performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete_pending 
ON public.agendamentos (data_hora, status) 
WHERE lembrete_enviado = false;
