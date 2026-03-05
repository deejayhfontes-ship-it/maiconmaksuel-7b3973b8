-- Criar tabela registro_ponto para controle de jornada
CREATE TABLE public.registro_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  foto_comprovante TEXT,
  observacao TEXT,
  aprovado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índices para consultas frequentes
CREATE INDEX idx_registro_ponto_profissional ON public.registro_ponto(profissional_id);
CREATE INDEX idx_registro_ponto_timestamp ON public.registro_ponto(timestamp);
CREATE INDEX idx_registro_ponto_tipo ON public.registro_ponto(tipo);

-- Habilitar RLS
ALTER TABLE public.registro_ponto ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Permitir leitura de registro_ponto"
ON public.registro_ponto FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de registro_ponto"
ON public.registro_ponto FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir atualização de registro_ponto"
ON public.registro_ponto FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir exclusão de registro_ponto"
ON public.registro_ponto FOR DELETE
USING (auth.uid() IS NOT NULL);