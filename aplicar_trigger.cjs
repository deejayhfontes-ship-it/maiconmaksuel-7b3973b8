const https = require('https');

const PAT = 'sbp_d0c8db58f9799b7309cc1a2b52ea6c0d4cbd8590';
const PROJECT = 'hhzvjsrsoyhjzeiuxpep';
// Service key real (sem placeholder)
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0NjQyNiwiZXhwIjoyMDgzNzIyNDI2fQ.GlGVDmEbr3xXkMBq5jIHxNf4YLSJ4i1jxELqGFhJt3o';

function runSQL(sql) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + PAT,
        'Content-Length': Buffer.byteLength(payload),
      }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(payload);
    req.end();
  });
}

const SQL = `
CREATE OR REPLACE FUNCTION public.enviar_confirmacao_agendamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sessao_ativa BOOLEAN := false;
  v_cliente RECORD;
  v_servico RECORD;
  v_token TEXT;
  v_mensagem TEXT;
  v_template TEXT;
  v_data_formatada TEXT;
  v_horario TEXT;
  v_salon RECORD;
BEGIN
  SELECT sessao_ativa INTO v_sessao_ativa FROM public.configuracoes_whatsapp LIMIT 1;
  IF NOT COALESCE(v_sessao_ativa, false) THEN RETURN NEW; END IF;

  SELECT nome, celular INTO v_cliente FROM public.clientes WHERE id = NEW.cliente_id;
  IF v_cliente.celular IS NULL OR v_cliente.celular = '' THEN RETURN NEW; END IF;

  SELECT nome INTO v_servico FROM public.servicos WHERE id = NEW.servico_id;
  v_data_formatada := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  v_horario := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  v_token := encode(gen_random_bytes(16), 'hex');

  SELECT template_mensagem INTO v_template FROM public.comunicacao_lembretes
  WHERE tipo = 'confirmacao' AND ativo = true LIMIT 1;

  IF v_template IS NULL THEN
    v_template := 'Olá {{nome}}! Seu agendamento: {{servico}} em {{data}} às {{horario}}. Responda SIM para confirmar ou NÃO para cancelar.';
  END IF;

  SELECT nome_salao INTO v_salon FROM public.configuracoes_salao LIMIT 1;

  v_mensagem := replace(replace(replace(replace(replace(replace(replace(replace(
    v_template,
    '{{nome}}', COALESCE(v_cliente.nome, '')),
    '{{primeiro_nome}}', COALESCE(split_part(v_cliente.nome, ' ', 1), '')),
    '{{servico}}', COALESCE(v_servico.nome, '')),
    '{{data}}', v_data_formatada),
    '{{horario}}', v_horario),
    '{{hora}}', v_horario),
    '{{empresa}}', COALESCE(v_salon.nome_salao, '')),
    '{{salon_name}}', COALESCE(v_salon.nome_salao, ''));

  INSERT INTO public.confirmacoes_agendamento (agendamento_id, token_confirmacao, status, link_confirmacao)
  VALUES (NEW.id, v_token, 'pendente', 'https://maiconmaksuel-7b3973b8-nine.vercel.app/confirmar-agendamento?token=' || v_token)
  ON CONFLICT (agendamento_id) DO UPDATE SET
    token_confirmacao = v_token, status = 'pendente', confirmado_em = NULL, cancelado_em = NULL;

  PERFORM net.http_post(
    url := 'https://hhzvjsrsoyhjzeiuxpep.supabase.co/functions/v1/whatsapp-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${SERVICE_KEY}'
    ),
    body := jsonb_build_object('telefone', v_cliente.celular, 'mensagem', v_mensagem)
  );

  RETURN NEW;
END;
$function$;
`;

(async () => {
  console.log('Aplicando trigger SQL...');
  const r = await runSQL(SQL);
  console.log('Status HTTP:', r.status);

  try {
    const parsed = JSON.parse(r.body);
    if (Array.isArray(parsed) && parsed.length === 0) {
      console.log('✅ Trigger criado/atualizado com sucesso!');
    } else {
      console.log('Resposta:', JSON.stringify(parsed, null, 2));
    }
  } catch {
    console.log('Body raw:', r.body);
  }
})();
