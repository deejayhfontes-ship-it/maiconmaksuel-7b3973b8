-- ============================================
-- GENERAL SYSTEM SETTINGS EXTENSION
-- Salon Data, Appearance, Notifications
-- ============================================

-- 1. Create configuracoes_salao table for salon identity
CREATE TABLE IF NOT EXISTS public.configuracoes_salao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Salon Identity
  nome_salao text NOT NULL DEFAULT 'Meu Salão',
  nome_fantasia text,
  logo_url text,
  logo_updated_at timestamptz,
  -- Contact Info
  telefone_principal text,
  whatsapp text,
  email text,
  instagram text,
  facebook text,
  site text,
  -- Legal Info
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  -- Address
  endereco_cep text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create configuracoes_aparencia table for theme settings
CREATE TABLE IF NOT EXISTS public.configuracoes_aparencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Theme
  tema text NOT NULL DEFAULT 'system', -- 'light', 'dark', 'system'
  -- Colors (HSL format stored as text)
  cor_primaria text NOT NULL DEFAULT '211 100% 50%', -- iOS Blue
  cor_secundaria text NOT NULL DEFAULT '142 69% 49%', -- iOS Green
  cor_destaque text NOT NULL DEFAULT '4 90% 58%', -- iOS Red
  -- Custom accent colors (optional)
  cor_accent_custom text,
  -- UI Preferences
  tipografia_grande boolean DEFAULT false,
  modo_alto_contraste boolean DEFAULT false,
  animacoes_reduzidas boolean DEFAULT false,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create configuracoes_notificacoes table for notification settings
CREATE TABLE IF NOT EXISTS public.configuracoes_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- System Notifications
  sistema_ativo boolean DEFAULT true,
  sistema_sons boolean DEFAULT true,
  -- Birthday Notifications
  aniversario_ativo boolean DEFAULT true,
  aniversario_dias_antes integer DEFAULT 0,
  aniversario_template text DEFAULT 'Feliz Aniversário, {nome}! 🎂',
  -- Appointment Reminders
  lembrete_24h boolean DEFAULT true,
  lembrete_2h boolean DEFAULT true,
  lembrete_template text DEFAULT 'Olá {nome}, lembramos do seu agendamento amanhã às {hora}.',
  -- Confirmation Notifications
  confirmacao_ativa boolean DEFAULT true,
  confirmacao_horas_antes integer DEFAULT 24,
  confirmacao_template text DEFAULT 'Confirme seu agendamento para {data} às {hora}. Responda SIM ou NÃO.',
  -- Cancellation Notifications
  cancelamento_ativo boolean DEFAULT true,
  cancelamento_template text DEFAULT 'Seu agendamento foi cancelado. Entre em contato para remarcar.',
  -- Financial Alerts
  alerta_financeiro_ativo boolean DEFAULT true,
  alerta_caixa_baixo_valor numeric DEFAULT 100,
  -- Stock Alerts
  alerta_estoque_ativo boolean DEFAULT true,
  alerta_estoque_minimo integer DEFAULT 5,
  -- Administrative Alerts
  alerta_admin_ativo boolean DEFAULT true,
  -- Notification Channels
  canal_in_app boolean DEFAULT true,
  canal_email boolean DEFAULT false,
  canal_sms boolean DEFAULT false,
  canal_whatsapp boolean DEFAULT true,
  -- Quiet Hours
  horario_silencio_ativo boolean DEFAULT true,
  horario_silencio_inicio time DEFAULT '22:00',
  horario_silencio_fim time DEFAULT '07:00',
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create notification queue for offline support
CREATE TABLE IF NOT EXISTS public.notificacoes_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'aniversario', 'lembrete', 'confirmacao', 'alerta', etc.
  destinatario_id uuid, -- cliente_id, profissional_id, etc.
  destinatario_tipo text, -- 'cliente', 'profissional', 'admin'
  titulo text NOT NULL,
  mensagem text NOT NULL,
  dados_extras jsonb,
  canal text NOT NULL DEFAULT 'in_app', -- 'in_app', 'email', 'sms', 'whatsapp'
  status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'enviada', 'falha', 'cancelada'
  tentativas integer DEFAULT 0,
  agendada_para timestamptz,
  enviada_em timestamptz,
  erro_mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.configuracoes_salao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_aparencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_fila ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for configuracoes_salao (admin only for write)
CREATE POLICY "Permitir leitura de configuracoes_salao" 
ON public.configuracoes_salao FOR SELECT USING (true);

CREATE POLICY "Admin pode modificar configuracoes_salao" 
ON public.configuracoes_salao FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. RLS Policies for configuracoes_aparencia (admin only for write)
CREATE POLICY "Permitir leitura de configuracoes_aparencia" 
ON public.configuracoes_aparencia FOR SELECT USING (true);

CREATE POLICY "Admin pode modificar configuracoes_aparencia" 
ON public.configuracoes_aparencia FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RLS Policies for configuracoes_notificacoes (admin only for write)
CREATE POLICY "Permitir leitura de configuracoes_notificacoes" 
ON public.configuracoes_notificacoes FOR SELECT USING (true);

CREATE POLICY "Admin pode modificar configuracoes_notificacoes" 
ON public.configuracoes_notificacoes FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. RLS Policies for notificacoes_fila
CREATE POLICY "Permitir leitura de notificacoes_fila" 
ON public.notificacoes_fila FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir inserção de notificacoes_fila" 
ON public.notificacoes_fila FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode modificar notificacoes_fila" 
ON public.notificacoes_fila FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode excluir notificacoes_fila" 
ON public.notificacoes_fila FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_fila_status ON public.notificacoes_fila(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_fila_agendada ON public.notificacoes_fila(agendada_para) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_notificacoes_fila_tipo ON public.notificacoes_fila(tipo);

-- 11. Create triggers for updated_at
CREATE TRIGGER update_configuracoes_salao_updated_at
BEFORE UPDATE ON public.configuracoes_salao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_aparencia_updated_at
BEFORE UPDATE ON public.configuracoes_aparencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_notificacoes_updated_at
BEFORE UPDATE ON public.configuracoes_notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Insert default records
INSERT INTO public.configuracoes_salao (nome_salao, nome_fantasia)
VALUES ('Maicon Maksuel Gestão de Salão', 'Salão Maicon')
ON CONFLICT DO NOTHING;

INSERT INTO public.configuracoes_aparencia (tema, cor_primaria, cor_secundaria, cor_destaque)
VALUES ('system', '211 100% 50%', '142 69% 49%', '4 90% 58%')
ON CONFLICT DO NOTHING;

INSERT INTO public.configuracoes_notificacoes (sistema_ativo)
VALUES (true)
ON CONFLICT DO NOTHING;