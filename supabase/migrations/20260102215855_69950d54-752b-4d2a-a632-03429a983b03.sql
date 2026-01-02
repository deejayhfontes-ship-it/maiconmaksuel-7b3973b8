-- Tabela para registrar histórico de importações
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  origem TEXT NOT NULL DEFAULT 'belezasoft',
  tempo_processamento_segundos INTEGER,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  
  -- Contagens por tipo
  clientes_importados INTEGER DEFAULT 0,
  clientes_duplicados INTEGER DEFAULT 0,
  clientes_erros INTEGER DEFAULT 0,
  
  servicos_importados INTEGER DEFAULT 0,
  servicos_duplicados INTEGER DEFAULT 0,
  servicos_erros INTEGER DEFAULT 0,
  
  produtos_importados INTEGER DEFAULT 0,
  produtos_duplicados INTEGER DEFAULT 0,
  produtos_erros INTEGER DEFAULT 0,
  
  profissionais_importados INTEGER DEFAULT 0,
  profissionais_duplicados INTEGER DEFAULT 0,
  profissionais_erros INTEGER DEFAULT 0,
  
  agendamentos_importados INTEGER DEFAULT 0,
  agendamentos_duplicados INTEGER DEFAULT 0,
  agendamentos_erros INTEGER DEFAULT 0,
  
  vendas_importadas INTEGER DEFAULT 0,
  vendas_duplicadas INTEGER DEFAULT 0,
  vendas_erros INTEGER DEFAULT 0,
  
  -- Estatísticas de sincronização
  sync_comissoes_recalculadas INTEGER DEFAULT 0,
  sync_estatisticas_atualizadas INTEGER DEFAULT 0,
  sync_estoque_atualizado BOOLEAN DEFAULT false,
  
  -- Erros e avisos
  erros_detalhados JSONB DEFAULT '[]'::jsonb,
  avisos JSONB DEFAULT '[]'::jsonb,
  
  -- Resumo final
  total_registros_importados INTEGER DEFAULT 0,
  total_registros_ignorados INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados poderem ver seus próprios logs
CREATE POLICY "Usuarios autenticados podem ver logs de importacao"
  ON public.import_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política para inserir logs
CREATE POLICY "Usuarios autenticados podem criar logs de importacao"
  ON public.import_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualizar logs próprios
CREATE POLICY "Usuarios autenticados podem atualizar logs de importacao"
  ON public.import_logs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX idx_import_logs_status ON public.import_logs(status);
CREATE INDEX idx_import_logs_usuario ON public.import_logs(usuario_id);

-- Comentário na tabela
COMMENT ON TABLE public.import_logs IS 'Registro de histórico de importações de dados de outros sistemas';