-- ======================================
-- Migração Consolidada: Planos, Fichas de Avaliação, NPS
-- ======================================

-- ======================================
-- 1. PLANOS (Pacotes de Serviços)
-- ======================================
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  servicos UUID[] DEFAULT '{}',
  sessoes_total INTEGER NOT NULL CHECK (sessoes_total > 0),
  preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  validade_dias INTEGER NOT NULL DEFAULT 90,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read planos"
ON public.planos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage planos"
ON public.planos FOR ALL USING (true) WITH CHECK (true);

-- ======================================
-- 2. PLANOS_CLIENTES (Vendas de Pacotes)
-- ======================================
CREATE TABLE IF NOT EXISTS public.planos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL,
  cliente_nome VARCHAR(200),
  sessoes_usadas INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'finalizado', 'expirado', 'cancelado')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planos_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read planos_clientes"
ON public.planos_clientes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage planos_clientes"
ON public.planos_clientes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_planos_clientes_status ON public.planos_clientes (status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_planos_clientes_cliente ON public.planos_clientes (cliente_id);

-- ======================================
-- 3. FICHAS DE AVALIAÇÃO
-- ======================================
CREATE TABLE IF NOT EXISTS public.fichas_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  cliente_nome VARCHAR(200),
  profissional_id UUID,
  tipo_avaliacao VARCHAR(50) NOT NULL DEFAULT 'geral',
  observacoes TEXT,
  campos_personalizados JSONB,
  fotos_antes TEXT[] DEFAULT '{}',
  fotos_depois TEXT[] DEFAULT '{}',
  nota_satisfacao INTEGER CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 5),
  data_avaliacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas_avaliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read fichas_avaliacao"
ON public.fichas_avaliacao FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage fichas_avaliacao"
ON public.fichas_avaliacao FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fichas_avaliacao_cliente ON public.fichas_avaliacao (cliente_id);
CREATE INDEX IF NOT EXISTS idx_fichas_avaliacao_tipo ON public.fichas_avaliacao (tipo_avaliacao);

-- ======================================
-- 4. NPS (Net Promoter Score)
-- ======================================
CREATE TABLE IF NOT EXISTS public.nps_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  cliente_nome VARCHAR(200),
  nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario TEXT,
  atendimento_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read nps_respostas"
ON public.nps_respostas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage nps_respostas"
ON public.nps_respostas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_nps_respostas_nota ON public.nps_respostas (nota);
CREATE INDEX IF NOT EXISTS idx_nps_respostas_created ON public.nps_respostas (created_at DESC);

-- ======================================
-- 5. Triggers para updated_at (onde aplicável)
-- ======================================
DO $$
BEGIN
  -- planos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planos_updated_at') THEN
    CREATE TRIGGER update_planos_updated_at
    BEFORE UPDATE ON public.planos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- planos_clientes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planos_clientes_updated_at') THEN
    CREATE TRIGGER update_planos_clientes_updated_at
    BEFORE UPDATE ON public.planos_clientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- fichas_avaliacao
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fichas_avaliacao_updated_at') THEN
    CREATE TRIGGER update_fichas_avaliacao_updated_at
    BEFORE UPDATE ON public.fichas_avaliacao
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;
