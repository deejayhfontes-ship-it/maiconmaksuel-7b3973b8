-- Adicionar coluna de especialidade para profissionais
ALTER TABLE public.profissionais 
ADD COLUMN especialidade text DEFAULT 'Cabelereira';