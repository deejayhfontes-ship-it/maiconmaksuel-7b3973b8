-- Adicionar colunas faltantes na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMP WITH TIME ZONE;

-- Adicionar colunas faltantes na tabela profissionais
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pin_acesso VARCHAR(4) UNIQUE;

-- Adicionar colunas na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS fotos_galeria TEXT[];

-- Criar buckets de storage (fotos-profissionais e fotos-produtos)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('fotos-profissionais', 'fotos-profissionais', true),
  ('fotos-produtos', 'fotos-produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para bucket clientes-fotos (já existe)
-- SELECT público
CREATE POLICY "Acesso público para visualizar fotos de clientes"
ON storage.objects FOR SELECT
USING (bucket_id = 'clientes-fotos');

-- INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem upload fotos de clientes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'clientes-fotos' AND auth.uid() IS NOT NULL);

-- UPDATE para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar fotos de clientes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'clientes-fotos' AND auth.uid() IS NOT NULL);

-- DELETE para usuários autenticados
CREATE POLICY "Usuários autenticados podem deletar fotos de clientes"
ON storage.objects FOR DELETE
USING (bucket_id = 'clientes-fotos' AND auth.uid() IS NOT NULL);

-- Políticas RLS para bucket fotos-profissionais
CREATE POLICY "Acesso público para visualizar fotos de profissionais"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-profissionais');

CREATE POLICY "Usuários autenticados podem upload fotos de profissionais"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-profissionais' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar fotos de profissionais"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos-profissionais' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar fotos de profissionais"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-profissionais' AND auth.uid() IS NOT NULL);

-- Políticas RLS para bucket fotos-produtos
CREATE POLICY "Acesso público para visualizar fotos de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-produtos');

CREATE POLICY "Usuários autenticados podem upload fotos de produtos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-produtos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar fotos de produtos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos-produtos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar fotos de produtos"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-produtos' AND auth.uid() IS NOT NULL);