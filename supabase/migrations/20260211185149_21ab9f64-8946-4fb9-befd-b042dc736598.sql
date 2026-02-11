
ALTER TABLE public.configuracoes_whatsapp
ADD COLUMN IF NOT EXISTS instance_name TEXT DEFAULT NULL;
