-- Criar tabela unificada de ponto para profissionais e funcionários
CREATE TABLE ponto_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('profissional', 'funcionario')),
  pessoa_id UUID NOT NULL,
  data DATE NOT NULL,
  entrada_manha TIME,
  saida_almoco TIME,
  entrada_tarde TIME,
  saida TIME,
  horas_trabalhadas DECIMAL(5,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tipo_pessoa, pessoa_id, data)
);

-- Índices para performance
CREATE INDEX idx_ponto_tipo_pessoa ON ponto_registros(tipo_pessoa, pessoa_id);
CREATE INDEX idx_ponto_data ON ponto_registros(data);
CREATE INDEX idx_ponto_tipo_data ON ponto_registros(tipo_pessoa, data);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ponto_registros_updated_at 
BEFORE UPDATE ON ponto_registros
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE ponto_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de ponto_registros" ON ponto_registros
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de ponto_registros" ON ponto_registros
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de ponto_registros" ON ponto_registros
FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de ponto_registros" ON ponto_registros
FOR DELETE USING (true);