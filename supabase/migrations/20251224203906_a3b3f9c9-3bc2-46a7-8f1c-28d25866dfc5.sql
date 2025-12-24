-- Adicionar campos função e endereço na tabela profissionais
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS funcao text DEFAULT 'Cabelereira',
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS cep text;