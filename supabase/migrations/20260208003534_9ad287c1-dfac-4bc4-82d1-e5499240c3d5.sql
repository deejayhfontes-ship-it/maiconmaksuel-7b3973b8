-- Drop existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Permitir atualização de configuracoes_aparencia para autentic" ON configuracoes_aparencia;

-- Create a more permissive UPDATE policy that allows any user to update
CREATE POLICY "Permitir atualização de configuracoes_aparencia" 
ON configuracoes_aparencia 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Also add INSERT policy for new records
DROP POLICY IF EXISTS "Permitir inserção de configuracoes_aparencia" ON configuracoes_aparencia;
CREATE POLICY "Permitir inserção de configuracoes_aparencia" 
ON configuracoes_aparencia 
FOR INSERT 
WITH CHECK (true);