
-- Create comunicacao_avaliacao_config table
CREATE TABLE IF NOT EXISTS public.comunicacao_avaliacao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT true,
  enviar_apos_minutos INTEGER NOT NULL DEFAULT 120,
  template_mensagem TEXT NOT NULL DEFAULT 'Olá {{nome}}! 💜

Como foi seu atendimento de {{servico}}? Avalie de 1 a 5 estrelas:

{{link_avaliacao}}

Sua opinião é muito importante para nós!
{{empresa}}',
  incluir_link_avaliacao BOOLEAN NOT NULL DEFAULT true,
  nota_minima_destaque INTEGER NOT NULL DEFAULT 4,
  solicitar_comentario BOOLEAN NOT NULL DEFAULT true,
  dias_da_semana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comunicacao_avaliacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to comunicacao_avaliacao_config" ON public.comunicacao_avaliacao_config
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default avaliacao config
INSERT INTO public.comunicacao_avaliacao_config (ativo, enviar_apos_minutos, nota_minima_destaque)
VALUES (true, 120, 4);

-- Seed default pos-atendimento record
INSERT INTO public.comunicacao_pos_atendimento (nome, tipo, template_mensagem, ativo, enviar_apos_minutos, incluir_link_avaliacao, incluir_cupom, cupom_desconto, dias_da_semana)
VALUES (
  'Agradecimento Padrão',
  'agradecimento',
  'Olá {{nome}}! 💜

Esperamos que tenha amado o resultado do seu {{servico}}! ✨

Avalie seu atendimento e ganhe 10% OFF na próxima visita:
{{link_avaliacao}}

Obrigado por confiar no {{empresa}}!
Até a próxima! 👋',
  true,
  60,
  true,
  true,
  'VOLTE10',
  '{1,2,3,4,5,6}'
);
