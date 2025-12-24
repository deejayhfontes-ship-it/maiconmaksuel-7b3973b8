-- Adicionar campo para total de visitas
ALTER TABLE public.clientes 
ADD COLUMN total_visitas INTEGER NOT NULL DEFAULT 0;