-- Create access logs table for tracking PIN entries
CREATE TABLE public.logs_acesso (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pino_id UUID REFERENCES public.pinos_acesso(id) ON DELETE SET NULL,
    nome_usuario TEXT NOT NULL,
    role TEXT NOT NULL,
    dispositivo TEXT,
    ip_address TEXT,
    user_agent TEXT,
    sucesso BOOLEAN NOT NULL DEFAULT true,
    motivo_falha TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permissions table for granular module access
CREATE TABLE public.permissoes_modulos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL,
    modulo TEXT NOT NULL,
    pode_visualizar BOOLEAN NOT NULL DEFAULT true,
    pode_editar BOOLEAN NOT NULL DEFAULT true,
    pode_excluir BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(role, modulo)
);

-- Enable RLS on both tables
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_modulos ENABLE ROW LEVEL SECURITY;

-- RLS policies for logs_acesso (read/write access)
CREATE POLICY "Permitir leitura de logs_acesso" ON public.logs_acesso FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de logs_acesso" ON public.logs_acesso FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de logs_acesso" ON public.logs_acesso FOR DELETE USING (true);

-- RLS policies for permissoes_modulos (CRUD access)
CREATE POLICY "Permitir leitura de permissoes_modulos" ON public.permissoes_modulos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de permissoes_modulos" ON public.permissoes_modulos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de permissoes_modulos" ON public.permissoes_modulos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de permissoes_modulos" ON public.permissoes_modulos FOR DELETE USING (true);

-- Insert default permissions for all roles and modules
INSERT INTO public.permissoes_modulos (role, modulo, pode_visualizar, pode_editar, pode_excluir) VALUES
-- Admin has full access
('admin', 'agenda', true, true, true),
('admin', 'atendimentos', true, true, true),
('admin', 'servicos', true, true, true),
('admin', 'profissionais', true, true, true),
('admin', 'produtos', true, true, true),
('admin', 'clientes', true, true, true),
('admin', 'caixa', true, true, true),
('admin', 'financeiro', true, true, true),
('admin', 'relatorios', true, true, true),
('admin', 'configuracoes', true, true, true),
('admin', 'notas_fiscais', true, true, true),
-- Notebook has limited access
('notebook', 'agenda', true, true, true),
('notebook', 'atendimentos', true, true, false),
('notebook', 'servicos', true, false, false),
('notebook', 'profissionais', true, false, false),
('notebook', 'produtos', true, false, false),
('notebook', 'clientes', true, true, false),
('notebook', 'caixa', true, true, false),
('notebook', 'financeiro', false, false, false),
('notebook', 'relatorios', false, false, false),
('notebook', 'configuracoes', false, false, false),
('notebook', 'notas_fiscais', false, false, false),
-- Kiosk has minimal access
('kiosk', 'agenda', true, false, false),
('kiosk', 'atendimentos', true, true, false),
('kiosk', 'servicos', false, false, false),
('kiosk', 'profissionais', false, false, false),
('kiosk', 'produtos', false, false, false),
('kiosk', 'clientes', false, false, false),
('kiosk', 'caixa', true, true, false),
('kiosk', 'financeiro', false, false, false),
('kiosk', 'relatorios', false, false, false),
('kiosk', 'configuracoes', false, false, false),
('kiosk', 'notas_fiscais', false, false, false);

-- Create index for faster log queries
CREATE INDEX idx_logs_acesso_created_at ON public.logs_acesso(created_at DESC);
CREATE INDEX idx_logs_acesso_pino_id ON public.logs_acesso(pino_id);