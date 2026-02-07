-- Create conversas_whatsapp table to store WhatsApp conversations
CREATE TABLE public.conversas_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  nome_contato TEXT NOT NULL,
  foto_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'aguardando', 'resolvido', 'arquivado')),
  etiqueta TEXT CHECK (etiqueta IN ('urgente', 'orcamento', 'reclamacao', 'agendamento', 'geral')),
  atendente_id UUID,
  ultima_mensagem TEXT,
  ultima_mensagem_hora TIMESTAMP WITH TIME ZONE,
  nao_lidas INTEGER NOT NULL DEFAULT 0,
  favorita BOOLEAN NOT NULL DEFAULT false,
  arquivada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mensagens_whatsapp table to store messages
CREATE TABLE public.mensagens_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.conversas_whatsapp(id) ON DELETE CASCADE,
  texto TEXT,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento', 'localizacao', 'sistema')),
  midia_url TEXT,
  midia_nome TEXT,
  enviada BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviando', 'enviada', 'entregue', 'lida', 'erro')),
  erro_mensagem TEXT,
  wa_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create respostas_rapidas table for quick reply templates
CREATE TABLE public.respostas_rapidas_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  atalho TEXT,
  categoria TEXT DEFAULT 'geral',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_conversas_whatsapp_telefone ON public.conversas_whatsapp(telefone);
CREATE INDEX idx_conversas_whatsapp_cliente_id ON public.conversas_whatsapp(cliente_id);
CREATE INDEX idx_conversas_whatsapp_status ON public.conversas_whatsapp(status);
CREATE INDEX idx_conversas_whatsapp_updated_at ON public.conversas_whatsapp(updated_at DESC);
CREATE INDEX idx_mensagens_whatsapp_conversa_id ON public.mensagens_whatsapp(conversa_id);
CREATE INDEX idx_mensagens_whatsapp_created_at ON public.mensagens_whatsapp(created_at DESC);

-- Enable RLS
ALTER TABLE public.conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_rapidas_whatsapp ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversas_whatsapp
CREATE POLICY "Permitir leitura de conversas_whatsapp"
  ON public.conversas_whatsapp FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de conversas_whatsapp"
  ON public.conversas_whatsapp FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de conversas_whatsapp"
  ON public.conversas_whatsapp FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de conversas_whatsapp"
  ON public.conversas_whatsapp FOR DELETE USING (true);

-- RLS Policies for mensagens_whatsapp
CREATE POLICY "Permitir leitura de mensagens_whatsapp"
  ON public.mensagens_whatsapp FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de mensagens_whatsapp"
  ON public.mensagens_whatsapp FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de mensagens_whatsapp"
  ON public.mensagens_whatsapp FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de mensagens_whatsapp"
  ON public.mensagens_whatsapp FOR DELETE USING (true);

-- RLS Policies for respostas_rapidas_whatsapp
CREATE POLICY "Permitir leitura de respostas_rapidas_whatsapp"
  ON public.respostas_rapidas_whatsapp FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de respostas_rapidas_whatsapp"
  ON public.respostas_rapidas_whatsapp FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de respostas_rapidas_whatsapp"
  ON public.respostas_rapidas_whatsapp FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de respostas_rapidas_whatsapp"
  ON public.respostas_rapidas_whatsapp FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_conversas_whatsapp_updated_at
  BEFORE UPDATE ON public.conversas_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_whatsapp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_whatsapp;

-- Insert default quick replies
INSERT INTO public.respostas_rapidas_whatsapp (titulo, mensagem, atalho, categoria, ordem) VALUES
  ('Saudação', 'Olá! Como posso ajudar? 😊', '/ola', 'saudacao', 1),
  ('Horários', 'Temos sim! Que horário prefere?', '/horario', 'agendamento', 2),
  ('Endereço', 'Nosso endereço: [ENDEREÇO DO SALÃO]', '/endereco', 'info', 3),
  ('Link Agendamento', 'Aqui está o link para agendamento online: {link}', '/link', 'agendamento', 4),
  ('Agradecimento', 'Obrigado pelo contato! Te esperamos 💜', '/obrigado', 'finalizacao', 5),
  ('Confirmação', 'Perfeito! Seu agendamento está confirmado para {data} às {hora}', '/confirma', 'agendamento', 6),
  ('Preços', 'Nossos preços são: [LISTA DE PREÇOS]', '/precos', 'info', 7),
  ('Aguarde', 'Um momento, por favor! Já vou verificar...', '/aguarde', 'atendimento', 8);