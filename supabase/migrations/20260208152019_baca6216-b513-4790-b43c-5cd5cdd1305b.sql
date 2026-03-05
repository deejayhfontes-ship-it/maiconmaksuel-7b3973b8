-- Enum para tipos de alerta
CREATE TYPE public.alert_type AS ENUM ('aniversario', 'agendamento', 'estoque', 'caixa', 'financeiro', 'sistema');

-- Enum para status do alerta
CREATE TYPE public.alert_status AS ENUM ('novo', 'em_andamento', 'resolvido', 'silenciado');

-- Enum para prioridade
CREATE TYPE public.alert_priority AS ENUM ('baixa', 'media', 'alta');

-- Tabela principal de alertas
CREATE TABLE public.notifications_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority alert_priority NOT NULL DEFAULT 'media',
  status alert_status NOT NULL DEFAULT 'novo',
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  assigned_to UUID,
  silenced_until TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de log de ações
CREATE TABLE public.notifications_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES public.notifications_alerts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  channel TEXT,
  payload JSONB DEFAULT '{}',
  result TEXT,
  user_id UUID,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de templates de notificação
CREATE TABLE public.notifications_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar preferências de comunicação na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS allow_whatsapp_marketing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_email_marketing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_notifications BOOLEAN DEFAULT true;

-- Índices para performance
CREATE INDEX idx_notifications_alerts_type ON public.notifications_alerts(type);
CREATE INDEX idx_notifications_alerts_status ON public.notifications_alerts(status);
CREATE INDEX idx_notifications_alerts_created ON public.notifications_alerts(created_at DESC);
CREATE INDEX idx_notifications_alerts_entity ON public.notifications_alerts(entity_type, entity_id);
CREATE INDEX idx_notifications_actions_alert ON public.notifications_actions_log(alert_id);

-- Habilitar RLS
ALTER TABLE public.notifications_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notifications_alerts (acesso público para leitura/escrita básica)
CREATE POLICY "Permitir leitura de alertas" ON public.notifications_alerts FOR SELECT USING (true);
CREATE POLICY "Permitir criar alertas" ON public.notifications_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizar alertas" ON public.notifications_alerts FOR UPDATE USING (true);
CREATE POLICY "Permitir deletar alertas" ON public.notifications_alerts FOR DELETE USING (true);

-- Políticas RLS para notifications_actions_log
CREATE POLICY "Permitir leitura de logs" ON public.notifications_actions_log FOR SELECT USING (true);
CREATE POLICY "Permitir criar logs" ON public.notifications_actions_log FOR INSERT WITH CHECK (true);

-- Políticas RLS para notifications_templates
CREATE POLICY "Permitir leitura de templates" ON public.notifications_templates FOR SELECT USING (true);
CREATE POLICY "Permitir gerenciar templates" ON public.notifications_templates FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notifications_alerts_updated_at
  BEFORE UPDATE ON public.notifications_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_templates_updated_at
  BEFORE UPDATE ON public.notifications_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão
INSERT INTO public.notifications_templates (type, name, subject, content, variables, is_default) VALUES
('aniversario', 'Parabéns Padrão', 'Feliz Aniversário!', 'Olá {nome}! 🎂

Toda a equipe do {salon_name} deseja a você um FELIZ ANIVERSÁRIO! 🎉

Aproveite seu dia especial e venha nos visitar para um tratamento VIP!

{cupom}

Com carinho,
{salon_name} 💜', ARRAY['nome', 'primeiro_nome', 'salon_name', 'cupom'], true),

('aniversario', 'Parabéns Descontraído', 'Felicidades!', 'Eiii {primeiro_nome}! 🥳

Hoje é seu dia! Parabéns pelos anos de pura beleza! ✨

Passa aqui no {salon_name} que tem um mimo te esperando!

{cupom}

Beijos! 😘', ARRAY['nome', 'primeiro_nome', 'salon_name', 'cupom'], false),

('agendamento', 'Lembrete de Horário', 'Lembrete de Agendamento', 'Olá {nome}! 👋

Lembrando do seu horário:
📅 Data: {data}
⏰ Horário: {hora}
✂️ Serviço: {servico}
👤 Profissional: {profissional}

Confirma sua presença? Responda SIM! 💜

{salon_name}', ARRAY['nome', 'data', 'hora', 'servico', 'profissional', 'salon_name'], true),

('agendamento', 'Reagendamento', 'Vamos remarcar?', 'Oi {nome}! 

Sentimos sua falta! 😢

Que tal reagendar seu horário conosco?

Acesse nosso link ou responda esta mensagem para encontrar o melhor horário.

{salon_name} 💜', ARRAY['nome', 'salon_name'], false);

-- Habilitar realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_alerts;