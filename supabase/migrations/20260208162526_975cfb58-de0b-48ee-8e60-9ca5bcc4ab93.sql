-- Tabela de permissões granulares por usuário (PIN)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pino_id UUID NOT NULL REFERENCES public.pinos_acesso(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(pino_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: apenas admins podem gerenciar permissões
CREATE POLICY "Permitir leitura de permissões" ON public.user_permissions
  FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem inserir permissões" ON public.user_permissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar permissões" ON public.user_permissions
  FOR UPDATE USING (true);

CREATE POLICY "Apenas admins podem remover permissões" ON public.user_permissions
  FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de auditoria para alterações em usuários/permissões
CREATE TABLE IF NOT EXISTS public.audit_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_pino_id UUID REFERENCES public.pinos_acesso(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  target_pino_id UUID REFERENCES public.pinos_acesso(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: apenas leitura para admins
CREATE POLICY "Permitir leitura de auditoria" ON public.audit_usuarios
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de auditoria" ON public.audit_usuarios
  FOR INSERT WITH CHECK (true);

-- Adicionar telefone na tabela pinos_acesso se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pinos_acesso' AND column_name = 'telefone'
  ) THEN
    ALTER TABLE public.pinos_acesso ADD COLUMN telefone VARCHAR(20);
  END IF;
END $$;