import urllib.request, json

PAT = 'sbp_3da33030a786befd8d78f3edf9384b67e56a2934'
PROJECT_REF = 'hhzvjsrsoyhjzeiuxpep'

sql = """
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
"""

data = json.dumps({'query': sql}).encode('utf-8')
req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query', data=data, method='POST')
req.add_header('Authorization', f'Bearer {PAT}')
req.add_header('Content-Type', 'application/json')
try:
    resp = urllib.request.urlopen(req)
    print('Webhook criado com sucesso via SQL!', resp.status)
except Exception as e:
    print('Erro ao criar webhook', getattr(e, 'read', lambda: b'()')().decode())
