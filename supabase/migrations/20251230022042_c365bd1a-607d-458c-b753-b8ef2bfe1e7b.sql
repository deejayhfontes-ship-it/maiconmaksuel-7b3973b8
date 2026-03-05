-- Criar tabela de vales e adiantamentos
CREATE TABLE public.vales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT,
  valor_total DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_restante DECIMAL(10,2) GENERATED ALWAYS AS (valor_total - valor_pago) STORED,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_quitacao DATE,
  motivo TEXT NOT NULL,
  observacoes TEXT,
  forma_desconto VARCHAR(20) NOT NULL DEFAULT 'unico' CHECK (forma_desconto IN ('unico', 'parcelado')),
  parcelas_total INTEGER,
  parcelas_pagas INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'quitado', 'cancelado')),
  quitado_por VARCHAR(20) CHECK (quitado_por IN ('comissao', 'dinheiro', 'outro')),
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_vales_profissional ON public.vales(profissional_id);
CREATE INDEX idx_vales_status ON public.vales(status);
CREATE INDEX idx_vales_data_lancamento ON public.vales(data_lancamento);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vales_updated_at
  BEFORE UPDATE ON public.vales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;

-- Policies para acesso autenticado
CREATE POLICY "Usuários autenticados podem ver vales"
  ON public.vales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar vales"
  ON public.vales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar vales"
  ON public.vales FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem excluir vales"
  ON public.vales FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vales;