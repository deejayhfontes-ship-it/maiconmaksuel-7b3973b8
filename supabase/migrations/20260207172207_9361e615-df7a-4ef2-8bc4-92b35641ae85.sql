-- Tabela para configurações de créditos/cobrança de mensagens
CREATE TABLE IF NOT EXISTS public.comunicacao_creditos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saldo_creditos integer NOT NULL DEFAULT 0,
  alerta_creditos_minimo integer NOT NULL DEFAULT 50,
  custo_por_mensagem numeric NOT NULL DEFAULT 0.05,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para histórico de recargas
CREATE TABLE IF NOT EXISTS public.comunicacao_recargas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor numeric NOT NULL,
  creditos_adquiridos integer NOT NULL,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para lembretes configuráveis
CREATE TABLE IF NOT EXISTS public.comunicacao_lembretes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  horas_antes integer NOT NULL DEFAULT 24,
  horario_envio time without time zone,
  template_mensagem text NOT NULL,
  incluir_endereco boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para respostas automáticas (chatbot)
CREATE TABLE IF NOT EXISTS public.comunicacao_respostas_automaticas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  palavras_chave text[] NOT NULL,
  tipo_resposta text NOT NULL,
  mensagem_resposta text NOT NULL,
  acao text,
  ativo boolean NOT NULL DEFAULT true,
  prioridade integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para campanhas de segmentação
CREATE TABLE IF NOT EXISTS public.comunicacao_campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  tipo_segmentacao text NOT NULL,
  criterio_dias_inativo integer,
  template_mensagem text NOT NULL,
  desconto_oferecido numeric,
  ativo boolean NOT NULL DEFAULT false,
  data_inicio date,
  data_fim date,
  total_enviados integer NOT NULL DEFAULT 0,
  total_respondidos integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para estatísticas de mensagens
CREATE TABLE IF NOT EXISTS public.comunicacao_estatisticas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL DEFAULT CURRENT_DATE,
  mensagens_enviadas integer NOT NULL DEFAULT 0,
  mensagens_entregues integer NOT NULL DEFAULT 0,
  mensagens_lidas integer NOT NULL DEFAULT 0,
  mensagens_respondidas integer NOT NULL DEFAULT 0,
  agendamentos_confirmados integer NOT NULL DEFAULT 0,
  agendamentos_cancelados integer NOT NULL DEFAULT 0,
  falhas_envio integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(data)
);

-- Tabela para templates prontos
CREATE TABLE IF NOT EXISTS public.comunicacao_templates_prontos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  estilo text NOT NULL,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  variaveis text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para configurações avançadas
CREATE TABLE IF NOT EXISTS public.comunicacao_config_avancadas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horario_silencio_inicio time without time zone NOT NULL DEFAULT '20:00:00',
  horario_silencio_fim time without time zone NOT NULL DEFAULT '08:00:00',
  limite_diario_mensagens integer NOT NULL DEFAULT 500,
  nome_remetente text,
  foto_perfil_url text,
  opt_out_keyword text NOT NULL DEFAULT 'SAIR',
  fallback_sms boolean NOT NULL DEFAULT false,
  sms_api_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para avaliações recebidas
CREATE TABLE IF NOT EXISTS public.comunicacao_avaliacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id),
  atendimento_id uuid REFERENCES public.atendimentos(id),
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  respondida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.comunicacao_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_recargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_respostas_automaticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_estatisticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_templates_prontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_config_avancadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_avaliacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
CREATE POLICY "Permitir leitura de comunicacao_creditos" ON public.comunicacao_creditos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_creditos" ON public.comunicacao_creditos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_creditos" ON public.comunicacao_creditos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_creditos" ON public.comunicacao_creditos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_recargas" ON public.comunicacao_recargas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_recargas" ON public.comunicacao_recargas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_recargas" ON public.comunicacao_recargas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_recargas" ON public.comunicacao_recargas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_lembretes" ON public.comunicacao_lembretes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_lembretes" ON public.comunicacao_lembretes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_lembretes" ON public.comunicacao_lembretes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_lembretes" ON public.comunicacao_lembretes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_respostas_automaticas" ON public.comunicacao_respostas_automaticas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_respostas_automaticas" ON public.comunicacao_respostas_automaticas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_respostas_automaticas" ON public.comunicacao_respostas_automaticas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_respostas_automaticas" ON public.comunicacao_respostas_automaticas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_campanhas" ON public.comunicacao_campanhas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_campanhas" ON public.comunicacao_campanhas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_campanhas" ON public.comunicacao_campanhas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_campanhas" ON public.comunicacao_campanhas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_estatisticas" ON public.comunicacao_estatisticas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_estatisticas" ON public.comunicacao_estatisticas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_estatisticas" ON public.comunicacao_estatisticas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_estatisticas" ON public.comunicacao_estatisticas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_templates_prontos" ON public.comunicacao_templates_prontos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_templates_prontos" ON public.comunicacao_templates_prontos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_templates_prontos" ON public.comunicacao_templates_prontos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_templates_prontos" ON public.comunicacao_templates_prontos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_config_avancadas" ON public.comunicacao_config_avancadas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_config_avancadas" ON public.comunicacao_config_avancadas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_config_avancadas" ON public.comunicacao_config_avancadas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_config_avancadas" ON public.comunicacao_config_avancadas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de comunicacao_avaliacoes" ON public.comunicacao_avaliacoes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comunicacao_avaliacoes" ON public.comunicacao_avaliacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de comunicacao_avaliacoes" ON public.comunicacao_avaliacoes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de comunicacao_avaliacoes" ON public.comunicacao_avaliacoes FOR DELETE USING (true);

-- Insert default lembretes
INSERT INTO public.comunicacao_lembretes (tipo, nome, descricao, ativo, horas_antes, horario_envio, template_mensagem)
VALUES 
  ('confirmacao_24h', 'Confirmação 24h', 'Lembrete de confirmação 24 horas antes', true, 24, '09:00', 'Olá {nome_cliente}! 👋

Lembrando do seu agendamento:
📅 Data: {data}
⏰ Horário: {hora}
✂️ Serviço: {servico}
👤 Profissional: {profissional}

Confirme sua presença respondendo SIM ou clique no link:
{link_confirmar}

Para cancelar: {link_cancelar}

Maicon Maksuel Cabeleireiro 💜'),
  ('lembrete_1h', 'Lembrete 1h Antes', 'Lembrete curto 1 hora antes', false, 1, NULL, 'Olá {nome_cliente}, seu horário é às {hora} com {profissional}. Nos vemos em breve! ✂️'),
  ('lembrete_4h', 'Lembrete Urgente 4h', 'Lembrete urgente para agendamentos não confirmados', false, 4, NULL, '{nome_cliente}, lembrando que você tem horário HOJE às {hora} no salão. Confirme presença respondendo SIM. 📱'),
  ('pos_atendimento', 'Pós-Atendimento', 'Mensagem de agradecimento e feedback após atendimento', true, -24, '10:00', 'Olá {nome_cliente}! 💜

Esperamos que tenha amado o resultado do seu {servico}! ✨

Avalie seu atendimento e ganhe 10% OFF na próxima visita:
{link_avaliacao}

Obrigado por confiar no Maicon Maksuel! 
Até a próxima! 👋');

-- Insert default respostas automáticas
INSERT INTO public.comunicacao_respostas_automaticas (palavras_chave, tipo_resposta, mensagem_resposta, acao, ativo, prioridade)
VALUES 
  (ARRAY['horario', 'agenda', 'marcar', 'agendar'], 'link_agendamento', 'Olá! 👋 Para agendar seu horário, acesse nosso link: {link_agendamento}

Ou ligue: {telefone_salao}', 'enviar_link', true, 10),
  (ARRAY['preço', 'preco', 'valor', 'custo', 'quanto'], 'tabela_servicos', 'Olá! 💜 Nossos principais serviços:

✂️ Corte Masculino: R$ 35
✂️ Corte Feminino: R$ 55
💇‍♀️ Escova: R$ 45
🎨 Coloração: a partir de R$ 120
💅 Manicure: R$ 25

Para valores personalizados, entre em contato! 📞', NULL, true, 10),
  (ARRAY['endereco', 'endereço', 'onde', 'localização', 'local', 'maps'], 'localizacao', 'Olá! 📍 Estamos localizados em:

{endereco_salao}

📱 Google Maps: {link_maps}

Aguardamos sua visita! 💜', NULL, true, 10),
  (ARRAY['cancelar', 'desmarcar', 'remarcar'], 'cancelamento', 'Para cancelar ou remarcar seu agendamento, acesse o link enviado na confirmação ou ligue: {telefone_salao}

⚠️ Lembre-se: cancelamentos com menos de 3h de antecedência podem ter taxa.', 'iniciar_cancelamento', true, 10),
  (ARRAY['sim', 'confirmo', 'confirmado', 'ok', 'vou'], 'confirmacao', '✅ Perfeito! Seu agendamento está CONFIRMADO!

Aguardamos você! 💜', 'confirmar_agendamento', true, 20),
  (ARRAY['nao', 'não', 'desistir', 'nao vou'], 'recusa', '😔 Entendido! Seu agendamento foi marcado como pendente.

Nossa equipe entrará em contato para remarcar.', 'marcar_pendente', true, 20);

-- Insert default campanhas
INSERT INTO public.comunicacao_campanhas (nome, descricao, tipo_segmentacao, criterio_dias_inativo, template_mensagem, desconto_oferecido, ativo)
VALUES 
  ('Reativação 30 dias', 'Clientes inativos há 30+ dias', 'inativos', 30, 'Oi {nome_cliente}! 💜

Sentimos sua falta por aqui! 😢

Que tal voltar com um desconto especial?
🎁 15% OFF no seu próximo agendamento!

Válido por 7 dias. Agende já:
{link_agendamento}', 15, false),
  ('Aniversariantes', 'Parabenizar aniversariantes do mês', 'aniversariantes', NULL, '🎂 Feliz Aniversário, {nome_cliente}! 🎉

O Maicon Maksuel deseja um dia maravilhoso!

🎁 PRESENTE: 20% OFF em qualquer serviço este mês!

Agende seu momento especial:
{link_agendamento}

💜 Parabéns!', 20, false),
  ('VIP', 'Clientes fiéis (5+ agendamentos)', 'vip', NULL, 'Olá {nome_cliente}! 🌟

Você é cliente VIP do Maicon Maksuel!

✨ Acesso antecipado a promoções
✨ Prioridade na agenda
✨ Brindes especiais

Aproveite seus benefícios exclusivos! 💜', NULL, false),
  ('Reconquista', 'Clientes que cancelaram recentemente', 'cancelados', 7, 'Oi {nome_cliente}! 💔

Vimos que você precisou cancelar seu horário...

Queremos você de volta! 🤗
🎁 Ganhe 10% OFF para reagendar

É só responder esta mensagem!', 10, false);

-- Insert default templates prontos
INSERT INTO public.comunicacao_templates_prontos (nome, estilo, tipo, mensagem, variaveis)
VALUES 
  ('Clássico', 'formal', 'confirmacao', 'Prezado(a) {nome_cliente},

Confirmamos seu agendamento para {data} às {hora}.
Serviço: {servico}
Profissional: {profissional}

Caso precise cancelar, favor entrar em contato com antecedência.

Atenciosamente,
{nome_salao}', ARRAY['nome_cliente', 'data', 'hora', 'servico', 'profissional', 'nome_salao']),
  ('Descontraído', 'informal', 'confirmacao', 'Eii {nome_cliente}! 🙋‍♀️

Bora ficar linda(o)?! ✨

📅 {data} às {hora}
✂️ {servico} com {profissional}

Confirma pra gente? Responde SIM! 💜

Beijos do {nome_salao} 😘', ARRAY['nome_cliente', 'data', 'hora', 'servico', 'profissional', 'nome_salao']),
  ('Luxo', 'elegante', 'confirmacao', '{nome_cliente}

Seu momento de beleza aguarda.

{data} | {hora}
{servico}

{nome_salao}', ARRAY['nome_cliente', 'data', 'hora', 'servico', 'nome_salao']),
  ('Clássico', 'formal', 'lembrete', 'Prezado(a) {nome_cliente},

Lembramos que seu horário está marcado para hoje às {hora}.

Aguardamos sua presença.

{nome_salao}', ARRAY['nome_cliente', 'hora', 'nome_salao']),
  ('Descontraído', 'informal', 'lembrete', '{nome_cliente}! ⏰

Seu horário é JÁ JÁ às {hora}! 

Te esperamos! 💜✂️', ARRAY['nome_cliente', 'hora']),
  ('Luxo', 'elegante', 'lembrete', '{nome_cliente}

Aguardamos você às {hora}.

{nome_salao}', ARRAY['nome_cliente', 'hora', 'nome_salao']);

-- Insert default config avancadas
INSERT INTO public.comunicacao_config_avancadas (horario_silencio_inicio, horario_silencio_fim, limite_diario_mensagens, nome_remetente, opt_out_keyword)
VALUES ('20:00', '08:00', 500, 'Maicon Maksuel', 'SAIR');

-- Insert default creditos
INSERT INTO public.comunicacao_creditos (saldo_creditos, alerta_creditos_minimo, custo_por_mensagem)
VALUES (1000, 50, 0.05);

-- Insert sample estatisticas for today
INSERT INTO public.comunicacao_estatisticas (data, mensagens_enviadas, mensagens_entregues, mensagens_lidas, mensagens_respondidas, agendamentos_confirmados, agendamentos_cancelados, falhas_envio)
VALUES (CURRENT_DATE, 45, 42, 38, 22, 18, 3, 3)
ON CONFLICT (data) DO NOTHING;