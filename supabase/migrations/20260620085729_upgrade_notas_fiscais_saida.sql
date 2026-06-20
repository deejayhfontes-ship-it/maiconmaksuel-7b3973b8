-- Upgrades para a tabela notas_fiscais (NFC-e integrada)

-- 1. Modificar o CHECK constraint de status para incluir 'contingencia'
ALTER TABLE public.notas_fiscais DROP CONSTRAINT IF EXISTS notas_fiscais_status_check;
ALTER TABLE public.notas_fiscais ADD CONSTRAINT notas_fiscais_status_check 
  CHECK (status IN ('rascunho', 'processando', 'autorizada', 'cancelada', 'rejeitada', 'contingencia'));

-- 2. Adicionar novas colunas
ALTER TABLE public.notas_fiscais 
  ADD COLUMN IF NOT EXISTS modelo TEXT DEFAULT '65' CHECK (modelo IN ('55', '65')),
  ADD COLUMN IF NOT EXISTS tipo_emissao TEXT DEFAULT 'normal' CHECK (tipo_emissao IN ('normal', 'contingencia_offline')),
  ADD COLUMN IF NOT EXISTS venda_id UUID UNIQUE; -- Idempotência: uma comanda/venda gera no máximo uma nota ativa

-- 3. Criar RPC para finalizar venda e emitir NFC-e atomicamente
-- Esta RPC faz o fechamento da comanda e cria a nota fiscal em 'processando'
-- Nota: Para simplificar o MVP e manter compatibilidade, a RPC vai focar apenas em injetar o registro na tabela notas_fiscais. O fechamento da comanda continuará no frontend (ou pode ser movido para a RPC se desejado, mas para não quebrar regras de negócios complexas do frontend, vamos focar a atomicidade na criação fiscal).

CREATE OR REPLACE FUNCTION finalizar_venda_com_nfce(
  p_venda_id UUID,
  p_cliente_id UUID,
  p_cliente_nome TEXT,
  p_cliente_cpf_cnpj TEXT,
  p_valor_total NUMERIC,
  p_itens JSONB,
  p_pagamento JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nota_id UUID;
BEGIN
  -- 1. Inserir a nota fiscal em status 'processando'
  -- Nota: Serie, Numero e Chave de Acesso serão preenchidos depois, 
  -- através do retorno síncrono da API Focus NFe.
  INSERT INTO public.notas_fiscais (
    venda_id,
    tipo,
    modelo,
    status,
    tipo_emissao,
    cliente_id,
    cliente_nome,
    cliente_cpf_cnpj,
    valor_total,
    data_emissao
  ) VALUES (
    p_venda_id,
    'nfce',
    '65',
    'processando',
    'normal',
    p_cliente_id,
    p_cliente_nome,
    p_cliente_cpf_cnpj,
    p_valor_total,
    now()
  ) RETURNING id INTO v_nota_id;

  -- 2. Inserir itens da nota (se a tabela notas_fiscais_itens já existir)
  -- Assumindo p_itens como um array de objetos JSON
  IF p_itens IS NOT NULL AND jsonb_array_length(p_itens) > 0 THEN
    INSERT INTO public.notas_fiscais_itens (
      nota_fiscal_id,
      numero_item,
      codigo_produto,
      descricao,
      quantidade,
      valor_unitario,
      valor_total
    )
    SELECT 
      v_nota_id,
      (item->>'numero_item')::integer,
      item->>'codigo_produto',
      item->>'descricao',
      (item->>'quantidade')::numeric,
      (item->>'valor_unitario')::numeric,
      (item->>'valor_total')::numeric
    FROM jsonb_array_elements(p_itens) AS item;
  END IF;

  RETURN v_nota_id;
END;
$$;
