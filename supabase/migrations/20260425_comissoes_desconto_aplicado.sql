-- Adiciona coluna desconto_aplicado em comissoes_registro
-- Armazena quanto do desconto do cliente foi absorvido por cada serviço (proporcional)
ALTER TABLE comissoes_registro
  ADD COLUMN IF NOT EXISTS desconto_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0;
