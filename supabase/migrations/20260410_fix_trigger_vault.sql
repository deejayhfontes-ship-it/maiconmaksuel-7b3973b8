-- ============================================================
-- SCRIPT DE CONSOLIDAÇÃO DO TRIGGER DA AGENDA E INCLUSÃO DO VAULT
-- Este script faz o seguinte:
-- 1. Desativa triggers duplicados (ex: tr_webhook_agendamento_n8n).
-- 2. Recria a function segura de envio de confirmação baseada no FIX original.
--    - Inserindo o status na whatsapp_logs
--    - Usando o Supabase Vault para gerenciar a chave Service Role Key!
-- ============================================================

DROP TRIGGER IF EXISTS tr_webhook_agendamento_n8n ON public.agendamentos;

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
  v_service_key TEXT;
BEGIN
  -- Bloco seguro: qualquer erro aqui NAO aborta o INSERT do agendamento
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

    -- INSIGHT LOGGING (FASE 3): Salva envio pendente em whatsapp_logs 
    -- antes de chamar a função. A edge function whatsapp-send fará o update.
    INSERT INTO public.whatsapp_logs (
      agendamento_id,
      numero_destino,
      mensagem,
      status_envio,
      tipo_mensagem
    ) VALUES (
      NEW.id,
      v_cliente.celular,
      v_mensagem,
      'pendente',
      'confirmacao'
    );

    -- BUSCA DA ROLE NO VAULT (SEGURANCA DA CHAVE)
    SELECT decrypted_secret INTO v_service_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' 
    LIMIT 1;

    IF v_service_key IS NULL THEN
       v_service_key := 'chave-ausente'; 
    END IF;

    -- CHAMA WEBHOOK PARA O ENVIO (passando o agendamento_id para ele atualizar na Log)
    PERFORM net.http_post(
      url := 'https://hhzvjsrsoyhjzeiuxpep.supabase.co/functions/v1/whatsapp-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'telefone', v_cliente.celular, 
        'mensagem', v_mensagem,
        'agendamento_id', NEW.id,
        'tipo_mensagem', 'confirmacao'
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Erro no WhatsApp: apenas loga, NAO aborta o agendamento
    RAISE WARNING '[trigger_confirmacao] Falha ao pre-processar WhatsApp: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enviar_confirmacao_agendamento ON public.agendamentos;
CREATE TRIGGER trg_enviar_confirmacao_agendamento
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_confirmacao_agendamento();
