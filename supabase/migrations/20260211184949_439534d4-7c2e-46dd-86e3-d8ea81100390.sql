
-- Function que envia confirmação WhatsApp ao inserir agendamento
CREATE OR REPLACE FUNCTION public.enviar_confirmacao_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_salon RECORD;
BEGIN
  -- 1. Verificar se WhatsApp está ativo
  SELECT sessao_ativa INTO v_sessao_ativa
  FROM public.configuracoes_whatsapp
  LIMIT 1;

  IF NOT COALESCE(v_sessao_ativa, false) THEN
    RETURN NEW;
  END IF;

  -- 2. Buscar dados do cliente
  SELECT nome, celular INTO v_cliente
  FROM public.clientes
  WHERE id = NEW.cliente_id;

  IF v_cliente.celular IS NULL OR v_cliente.celular = '' THEN
    RETURN NEW;
  END IF;

  -- 3. Buscar dados do serviço
  SELECT nome INTO v_servico
  FROM public.servicos
  WHERE id = NEW.servico_id;

  -- 4. Formatar data e horário
  v_data_formatada := to_char(NEW.data_hora, 'DD/MM/YYYY');
  v_horario := to_char(NEW.data_hora, 'HH24:MI');

  -- 5. Gerar token único
  v_token := encode(gen_random_bytes(16), 'hex');

  -- 6. Buscar template de confirmação
  SELECT template_mensagem INTO v_template
  FROM public.comunicacao_lembretes
  WHERE tipo = 'confirmacao' AND ativo = true
  LIMIT 1;

  IF v_template IS NULL THEN
    v_template := 'Olá {{nome}}! Seu agendamento está confirmado: {{servico}} dia {{data}} às {{horario}}. Responda SIM para confirmar ou NÃO para cancelar.';
  END IF;

  -- 7. Buscar nome do salão
  SELECT nome_salao INTO v_salon
  FROM public.configuracoes_salao
  LIMIT 1;

  -- 8. Substituir variáveis
  v_mensagem := v_template;
  v_mensagem := replace(v_mensagem, '{{nome}}', COALESCE(v_cliente.nome, ''));
  v_mensagem := replace(v_mensagem, '{nome}', COALESCE(v_cliente.nome, ''));
  v_mensagem := replace(v_mensagem, '{{primeiro_nome}}', COALESCE(split_part(v_cliente.nome, ' ', 1), ''));
  v_mensagem := replace(v_mensagem, '{primeiro_nome}', COALESCE(split_part(v_cliente.nome, ' ', 1), ''));
  v_mensagem := replace(v_mensagem, '{{servico}}', COALESCE(v_servico.nome, ''));
  v_mensagem := replace(v_mensagem, '{servico}', COALESCE(v_servico.nome, ''));
  v_mensagem := replace(v_mensagem, '{{data}}', v_data_formatada);
  v_mensagem := replace(v_mensagem, '{data}', v_data_formatada);
  v_mensagem := replace(v_mensagem, '{{horario}}', v_horario);
  v_mensagem := replace(v_mensagem, '{horario}', v_horario);
  v_mensagem := replace(v_mensagem, '{{hora}}', v_horario);
  v_mensagem := replace(v_mensagem, '{hora}', v_horario);
  v_mensagem := replace(v_mensagem, '{{empresa}}', COALESCE(v_salon.nome_salao, ''));
  v_mensagem := replace(v_mensagem, '{empresa}', COALESCE(v_salon.nome_salao, ''));
  v_mensagem := replace(v_mensagem, '{{salon_name}}', COALESCE(v_salon.nome_salao, ''));
  v_mensagem := replace(v_mensagem, '{salon_name}', COALESCE(v_salon.nome_salao, ''));

  -- 9. Inserir confirmação pendente
  INSERT INTO public.confirmacoes_agendamento (
    agendamento_id,
    token_confirmacao,
    status,
    link_confirmacao
  ) VALUES (
    NEW.id,
    v_token,
    'pendente',
    'https://maiconmaksuel.lovable.app/confirmar-agendamento?token=' || v_token
  )
  ON CONFLICT (agendamento_id) DO UPDATE SET
    token_confirmacao = v_token,
    status = 'pendente',
    confirmado_em = NULL,
    cancelado_em = NULL;

  -- 10. Chamar edge function via pg_net
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback para variáveis de ambiente conhecidas
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://dqcvdgugqqvdjxjflwaq.supabase.co';
  END IF;

  IF v_service_key IS NOT NULL AND v_service_key <> '' THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/whatsapp-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'telefone', v_cliente.celular,
        'mensagem', v_mensagem
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_enviar_confirmacao_agendamento ON public.agendamentos;
CREATE TRIGGER trg_enviar_confirmacao_agendamento
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_confirmacao_agendamento();
