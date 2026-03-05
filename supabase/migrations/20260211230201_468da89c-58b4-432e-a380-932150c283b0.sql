
-- Add missing columns to configuracoes_kiosk that the frontend expects
ALTER TABLE public.configuracoes_kiosk
  ADD COLUMN IF NOT EXISTS modulo_agenda boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_fechamento_comanda boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS modulo_relogio boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS modulo_mensagens_idle boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagens_idle jsonb DEFAULT '[{"id":"1","text":"Bem-vindo ao nosso salão!","enabled":true},{"id":"2","text":"Toque para começar","enabled":true},{"id":"3","text":"Oferecemos os melhores serviços","enabled":true}]'::jsonb,
  ADD COLUMN IF NOT EXISTS mensagem_obrigado text DEFAULT 'Obrigado pela preferência! Volte sempre!',
  ADD COLUMN IF NOT EXISTS duracao_obrigado integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS duracao_comanda integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS fonte_tamanho integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS modo_alto_contraste boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS som_toque boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS offline_mensagem text DEFAULT 'Estamos sem conexão no momento. Por favor, aguarde.',
  ADD COLUMN IF NOT EXISTS offline_cache_config boolean DEFAULT true;
