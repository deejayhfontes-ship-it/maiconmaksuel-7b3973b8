-- Tabela de configurações do WhatsApp
CREATE TABLE public.configuracoes_whatsapp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_provider text NOT NULL DEFAULT 'evolution_api',
  api_url text,
  api_token text,
  numero_whatsapp text,
  qrcode_conectado boolean NOT NULL DEFAULT false,
  sessao_ativa boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de templates de mensagens
CREATE TABLE public.mensagens_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  variaveis_disponiveis jsonb DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de mensagens enviadas
CREATE TABLE public.mensagens_enviadas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.mensagens_templates(id) ON DELETE SET NULL,
  telefone_destino text NOT NULL,
  mensagem_enviada text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_envio timestamp with time zone,
  data_entrega timestamp with time zone,
  data_leitura timestamp with time zone,
  erro_mensagem text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de confirmações de agendamento
CREATE TABLE public.confirmacoes_agendamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE UNIQUE,
  token_confirmacao text NOT NULL UNIQUE,
  link_confirmacao text,
  status text NOT NULL DEFAULT 'pendente',
  confirmado_em timestamp with time zone,
  cancelado_em timestamp with time zone,
  ip_confirmacao text,
  observacao_cancelamento text,
  taxa_aplicada boolean NOT NULL DEFAULT false,
  valor_taxa decimal(10,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de configurações de taxa por falta
CREATE TABLE public.configuracoes_taxa_falta (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cobrar_taxa boolean NOT NULL DEFAULT true,
  valor_taxa decimal(10,2) NOT NULL DEFAULT 30.00,
  prazo_minimo_cancelamento_horas integer NOT NULL DEFAULT 3,
  comportamento_cancelamento_tardio text NOT NULL DEFAULT 'cobrar_integral',
  aplicacao_taxa text NOT NULL DEFAULT 'manual',
  horario_inicio_envio time NOT NULL DEFAULT '08:00',
  horario_fim_envio time NOT NULL DEFAULT '22:00',
  tentar_reenvio boolean NOT NULL DEFAULT true,
  tentativas_reenvio integer NOT NULL DEFAULT 3,
  intervalo_reenvio_minutos integer NOT NULL DEFAULT 30,
  prazo_confirmacao_horas integer NOT NULL DEFAULT 2,
  comportamento_sem_confirmacao text NOT NULL DEFAULT 'marcar_nao_confirmado',
  notificar_confirmacao boolean NOT NULL DEFAULT true,
  notificar_cancelamento boolean NOT NULL DEFAULT true,
  notificar_sem_resposta boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmacoes_agendamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_taxa_falta ENABLE ROW LEVEL SECURITY;

-- RLS Policies para configuracoes_whatsapp
CREATE POLICY "Permitir leitura de configuracoes_whatsapp" ON public.configuracoes_whatsapp FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de configuracoes_whatsapp" ON public.configuracoes_whatsapp FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de configuracoes_whatsapp" ON public.configuracoes_whatsapp FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de configuracoes_whatsapp" ON public.configuracoes_whatsapp FOR DELETE USING (true);

-- RLS Policies para mensagens_templates
CREATE POLICY "Permitir leitura de mensagens_templates" ON public.mensagens_templates FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de mensagens_templates" ON public.mensagens_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de mensagens_templates" ON public.mensagens_templates FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de mensagens_templates" ON public.mensagens_templates FOR DELETE USING (true);

-- RLS Policies para mensagens_enviadas
CREATE POLICY "Permitir leitura de mensagens_enviadas" ON public.mensagens_enviadas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de mensagens_enviadas" ON public.mensagens_enviadas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de mensagens_enviadas" ON public.mensagens_enviadas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de mensagens_enviadas" ON public.mensagens_enviadas FOR DELETE USING (true);

-- RLS Policies para confirmacoes_agendamento
CREATE POLICY "Permitir leitura de confirmacoes_agendamento" ON public.confirmacoes_agendamento FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de confirmacoes_agendamento" ON public.confirmacoes_agendamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de confirmacoes_agendamento" ON public.confirmacoes_agendamento FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de confirmacoes_agendamento" ON public.confirmacoes_agendamento FOR DELETE USING (true);

-- RLS Policies para configuracoes_taxa_falta
CREATE POLICY "Permitir leitura de configuracoes_taxa_falta" ON public.configuracoes_taxa_falta FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de configuracoes_taxa_falta" ON public.configuracoes_taxa_falta FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de configuracoes_taxa_falta" ON public.configuracoes_taxa_falta FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de configuracoes_taxa_falta" ON public.configuracoes_taxa_falta FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_configuracoes_whatsapp_updated_at
  BEFORE UPDATE ON public.configuracoes_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mensagens_templates_updated_at
  BEFORE UPDATE ON public.mensagens_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_taxa_falta_updated_at
  BEFORE UPDATE ON public.configuracoes_taxa_falta
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão
INSERT INTO public.mensagens_templates (tipo, titulo, mensagem, variaveis_disponiveis) VALUES
('confirmacao_agendamento', 'Confirmação de Agendamento', 'Olá {cliente}! 😊

Você tem um agendamento amanhã:

📅 Data: {data}
⏰ Horário: {hora}
💇 Serviço: {servico}
👤 Profissional: {profissional}

Por favor, confirme sua presença:

✅ Confirmar: {link_confirmar}
❌ Cancelar: {link_cancelar}

⚠️ IMPORTANTE: Em caso de não comparecimento SEM cancelamento com antecedência, será cobrada uma taxa de R$ {taxa_falta} na próxima visita.

Aguardamos você! 💖
{nome_salao}
{telefone_salao}', '["cliente", "data", "hora", "servico", "profissional", "link_confirmar", "link_cancelar", "taxa_falta", "nome_salao", "telefone_salao"]'::jsonb),

('lembrete_3horas', 'Lembrete 3 Horas Antes', 'Olá {cliente}! 😊

Lembrete: seu atendimento é às {hora}.

📅 {data}
💇 {servico}
👤 Com {profissional}

Te esperamos! 💖
{nome_salao}', '["cliente", "data", "hora", "servico", "profissional", "nome_salao"]'::jsonb),

('agendamento_confirmado', 'Agendamento Confirmado', 'Olá {cliente}! ✅

Seu agendamento foi confirmado!

📅 {data} às {hora}
💇 {servico}
👤 Com {profissional}

Te esperamos! 💖
{nome_salao}', '["cliente", "data", "hora", "servico", "profissional", "nome_salao"]'::jsonb),

('cancelamento', 'Cancelamento Confirmado', 'Olá {cliente}!

Seu agendamento foi cancelado conforme solicitado.

📅 {data} às {hora}
💇 {servico}

Caso queira reagendar, entre em contato:
📱 {telefone_salao}

{nome_salao}', '["cliente", "data", "hora", "servico", "telefone_salao", "nome_salao"]'::jsonb),

('pos_atendimento', 'Agradecimento Pós-Atendimento', 'Olá {cliente}! 😊

Obrigado por sua visita ontem!
Esperamos que tenha gostado do resultado.

Até a próxima! 💖
{nome_salao}', '["cliente", "nome_salao"]'::jsonb);

-- Inserir configuração padrão de taxa
INSERT INTO public.configuracoes_taxa_falta (cobrar_taxa, valor_taxa) VALUES (true, 30.00);

-- Adicionar coluna receber_mensagens na tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS receber_mensagens boolean NOT NULL DEFAULT true;