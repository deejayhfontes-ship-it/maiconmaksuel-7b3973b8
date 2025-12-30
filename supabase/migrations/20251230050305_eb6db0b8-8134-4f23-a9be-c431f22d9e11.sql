-- Criar tabela de cheques
CREATE TABLE public.cheques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cheque VARCHAR(50) NOT NULL,
  banco VARCHAR(100),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  emitente VARCHAR(255) NOT NULL,
  cpf_cnpj_emitente VARCHAR(20),
  valor NUMERIC(12,2) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_compensacao DATE,
  data_devolucao DATE,
  motivo_devolucao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'compensado', 'devolvido', 'reapresentado')),
  atendimento_id UUID REFERENCES public.atendimentos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  caixa_id UUID REFERENCES public.caixa(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (todos os usuários autenticados podem gerenciar)
CREATE POLICY "Usuários autenticados podem ver cheques"
ON public.cheques FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir cheques"
ON public.cheques FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar cheques"
ON public.cheques FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar cheques"
ON public.cheques FOR DELETE TO authenticated USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_cheques_updated_at
BEFORE UPDATE ON public.cheques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_cheques_status ON public.cheques(status);
CREATE INDEX idx_cheques_data_vencimento ON public.cheques(data_vencimento);
CREATE INDEX idx_cheques_cliente_id ON public.cheques(cliente_id);
CREATE INDEX idx_cheques_caixa_id ON public.cheques(caixa_id);