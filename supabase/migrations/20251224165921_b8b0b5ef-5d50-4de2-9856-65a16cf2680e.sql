-- Criar bucket para fotos de clientes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clientes-fotos', 'clientes-fotos', true);

-- Política para leitura pública
CREATE POLICY "Fotos de clientes são públicas" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'clientes-fotos');

-- Política para upload
CREATE POLICY "Permitir upload de fotos de clientes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'clientes-fotos');

-- Política para atualização
CREATE POLICY "Permitir atualização de fotos de clientes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'clientes-fotos');

-- Política para exclusão
CREATE POLICY "Permitir exclusão de fotos de clientes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'clientes-fotos');