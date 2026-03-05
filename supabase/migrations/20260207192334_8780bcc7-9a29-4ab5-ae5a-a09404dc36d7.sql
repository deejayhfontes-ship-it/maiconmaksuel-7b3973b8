-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Permitir atualização de configuracoes_salao" ON public.configuracoes_salao;
DROP POLICY IF EXISTS "Permitir atualização de configuracoes_aparencia" ON public.configuracoes_aparencia;
DROP POLICY IF EXISTS "Permitir atualização de configuracoes_notificacoes" ON public.configuracoes_notificacoes;

-- Create correct UPDATE policies for authenticated users (admin-level settings)
CREATE POLICY "Permitir atualização de configuracoes_salao para autenticados" 
ON public.configuracoes_salao 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização de configuracoes_aparencia para autenticados" 
ON public.configuracoes_aparencia 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização de configuracoes_notificacoes para autenticados" 
ON public.configuracoes_notificacoes 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');