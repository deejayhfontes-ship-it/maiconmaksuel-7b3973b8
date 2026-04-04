-- Habilitar a extensão pg_net se não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar a função que envia a requisição HTTP para o webhook do N8N
CREATE OR REPLACE FUNCTION public.webhook_agendamento_n8n()
RETURNS TRIGGER AS $$
DECLARE
  request_body JSONB;
BEGIN
  -- Monta o payload no exato formato esperado pelo n8n
  request_body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'agendamentos',
    'schema', 'public',
    'record', row_to_json(NEW),
    'old_record', null
  );

  -- Envia via sub-requisição assíncrona usando pg_net
  PERFORM net.http_post(
    url := 'https://n8n.srv1479281.hstgr.cloud/webhook/confirmacao-imediata',
    body := request_body,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar o trigger se já existir para evitar erro
DROP TRIGGER IF EXISTS tr_webhook_agendamento_n8n ON public.agendamentos;

-- Criar o trigger de fato na tabela agendamentos
CREATE TRIGGER tr_webhook_agendamento_n8n
AFTER INSERT ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.webhook_agendamento_n8n();
