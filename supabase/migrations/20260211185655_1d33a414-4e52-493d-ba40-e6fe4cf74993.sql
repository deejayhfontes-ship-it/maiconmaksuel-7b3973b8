
-- Create comunicacao_pos_atendimento table
CREATE TABLE public.comunicacao_pos_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('agradecimento', 'pesquisa', 'retorno', 'promocao')),
  template_mensagem TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  enviar_apos_minutos INTEGER NOT NULL DEFAULT 60,
  incluir_link_avaliacao BOOLEAN NOT NULL DEFAULT true,
  incluir_cupom BOOLEAN NOT NULL DEFAULT false,
  cupom_desconto TEXT DEFAULT NULL,
  dias_da_semana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comunicacao_pos_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to comunicacao_pos_atendimento"
ON public.comunicacao_pos_atendimento FOR ALL USING (true) WITH CHECK (true);

-- Add pos_atendimento_enviado to atendimentos
ALTER TABLE public.atendimentos ADD COLUMN IF NOT EXISTS pos_atendimento_enviado BOOLEAN NOT NULL DEFAULT false;
