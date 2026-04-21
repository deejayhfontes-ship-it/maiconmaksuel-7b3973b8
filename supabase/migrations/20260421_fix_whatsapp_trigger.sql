-- ============================================================
-- MIGRATION: Corrigir estrutura para WhatsApp funcionar
-- 1. Adicionar coluna estilo em comunicacao_templates_prontos
-- 2. Criar tabela user_permissions se não existir
-- 3. Corrigir trigger de envio de confirmação
-- ============================================================

-- 1. Adicionar coluna estilo (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'comunicacao_templates_prontos' 
    AND column_name = 'estilo'
  ) THEN
    ALTER TABLE public.comunicacao_templates_prontos 
    ADD COLUMN estilo TEXT DEFAULT 'padrao';
  END IF;
END $$;

-- 2. Criar tabela user_permissions (se não existir)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pino_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pino_id, permission_key)
);

-- RLS para user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
CREATE POLICY "user_permissions_select" ON public.user_permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_permissions_all" ON public.user_permissions;
CREATE POLICY "user_permissions_all" ON public.user_permissions
  FOR ALL USING (true);

-- 3. Recriar trigger de confirmação corrigida (com tratamento de erro robusto)
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
  BEGIN
    -- Verifica se WhatsApp está ativo
    SELECT sessao_ativa INTO v_sessao_ativa 
    FROM public.configuracoes_whatsapp LIMIT 1;
    
    IF NOT COALESCE(v_sessao_ativa, false) THEN 
      RETURN NEW; 
    END IF;

    -- Busca dados do cliente
    SELECT nome, celular INTO v_cliente 
    FROM public.clientes WHERE id = NEW.cliente_id;
    
    IF v_cliente IS NULL OR v_cliente.celular IS NULL OR trim(v_cliente.celular) = '' THEN 
      RETURN NEW; 
    END IF;

    -- Busca serviço
    SELECT nome INTO v_servico 
    FROM public.servicos WHERE id = NEW.servico_id;
    
    v_data_formatada := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
    v_horario := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
    v_token := encode(gen_random_bytes(16), 'hex');

    -- Busca template de confirmação
    SELECT template_mensagem INTO v_template 
    FROM public.comunicacao_lembretes
    WHERE tipo = 'confirmacao' AND ativo = true LIMIT 1;

    IF v_template IS NULL OR trim(v_template) = '' THEN
      v_template := 'Olá {{nome}}! Seu agendamento foi confirmado: {{servico}} em {{data}} às {{horario}}. Responda SIM para confirmar ou NÃO para cancelar.';
    END IF;

    -- Busca nome do salão
    SELECT nome_salao INTO v_salon 
    FROM public.configuracoes_salao LIMIT 1;

    -- Monta a mensagem final
    v_mensagem := replace(replace(replace(replace(replace(replace(replace(replace(
      v_template,
      '{{nome}}', COALESCE(v_cliente.nome, '')),
      '{{primeiro_nome}}', COALESCE(split_part(v_cliente.nome, ' ', 1), '')),
      '{{servico}}', COALESCE(v_servico.nome, '')),
      '{{data}}', v_data_formatada),
      '{{horario}}', v_horario),
      '{{hora}}', v_horario),
      '{{empresa}}', COALESCE(v_salon.nome_salao, 'Salão')),
      '{{salon_name}}', COALESCE(v_salon.nome_salao, 'Salão'));

    -- Salva token de confirmação
    INSERT INTO public.confirmacoes_agendamento (agendamento_id, token_confirmacao, status, link_confirmacao)
    VALUES (
      NEW.id, v_token, 'pendente', 
      'https://maiconmaksuel-7b3973b8-nine.vercel.app/confirmar-agendamento?token=' || v_token
    )
    ON CONFLICT (agendamento_id) DO UPDATE SET
      token_confirmacao = v_token, 
      status = 'pendente', 
      confirmado_em = NULL, 
      cancelado_em = NULL;

    -- Registra log de envio pendente
    INSERT INTO public.whatsapp_logs (
      agendamento_id, numero_destino, mensagem, status_envio, tipo_mensagem
    ) VALUES (
      NEW.id, v_cliente.celular, v_mensagem, 'pendente', 'confirmacao'
    )
    ON CONFLICT DO NOTHING;

    -- Busca service key do Vault
    BEGIN
      SELECT decrypted_secret INTO v_service_key 
      FROM vault.decrypted_secrets 
      WHERE name = 'service_role_key' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_service_key := NULL;
    END;

    IF v_service_key IS NULL OR trim(v_service_key) = '' THEN
      -- Atualiza log com erro de chave ausente
      UPDATE public.whatsapp_logs 
      SET status_envio = 'erro', observacoes = 'service_role_key não encontrada no Vault'
      WHERE agendamento_id = NEW.id AND tipo_mensagem = 'confirmacao';
      RETURN NEW;
    END IF;

    -- Chama Edge Function para envio real
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
    RAISE WARNING '[trigger_confirmacao] Erro: %', SQLERRM;
    -- Atualiza log com o erro real para facilitar diagnóstico
    BEGIN
      UPDATE public.whatsapp_logs 
      SET status_envio = 'erro', observacoes = SQLERRM
      WHERE agendamento_id = NEW.id AND tipo_mensagem = 'confirmacao';
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ignora erro ao atualizar log
    END;
  END;

  RETURN NEW;
END;
$function$;

-- Recriar trigger na tabela agendamentos
DROP TRIGGER IF EXISTS trg_enviar_confirmacao_agendamento ON public.agendamentos;
CREATE TRIGGER trg_enviar_confirmacao_agendamento
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_confirmacao_agendamento();
