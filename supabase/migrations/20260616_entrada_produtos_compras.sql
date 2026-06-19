-- Migration para Módulo de Entrada de Produtos (Compras & Fornecedores)
-- Data: 2026-06-16

-- 1. Criação das Tabelas

-- 1.1 fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id UUID NOT NULL,
    tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PJ', 'PF')),
    documento TEXT NOT NULL, -- CNPJ ou CPF (somente números)
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    inscricao_estadual TEXT,
    endereco_logradouro TEXT,
    endereco_numero TEXT,
    endereco_bairro TEXT,
    endereco_municipio TEXT,
    endereco_uf TEXT,
    endereco_cep TEXT,
    email TEXT,
    telefone TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fornecedores_salao_doc_key UNIQUE (salao_id, documento)
);

-- 1.2 produto_fornecedor (De-Para de códigos de produto)
CREATE TABLE IF NOT EXISTS public.produto_fornecedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id UUID NOT NULL,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    codigo_fornecedor TEXT NOT NULL, -- cProd na nota
    ean TEXT, -- GTIN / Código de barras
    unidade_compra TEXT, -- uCom (ex: CX, UN)
    fator_conversao NUMERIC(15,4) DEFAULT 1, -- Quantidade de itens de venda em 1 item de compra
    ultimo_custo NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT produto_fornecedor_unique_key UNIQUE (salao_id, fornecedor_id, codigo_fornecedor)
);

-- 1.3 notas_fiscais_entrada
CREATE TABLE IF NOT EXISTS public.notas_fiscais_entrada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id UUID NOT NULL,
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
    chave_acesso TEXT NOT NULL, -- 44 dígitos
    numero INTEGER, -- nNF
    serie INTEGER,
    modelo TEXT DEFAULT '55',
    natureza_operacao TEXT, -- natOp
    data_emissao TIMESTAMPTZ, -- dhEmi
    data_entrada TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    valor_produtos NUMERIC(15,2),
    valor_desconto NUMERIC(15,2),
    valor_frete NUMERIC(15,2),
    valor_outros NUMERIC(15,2),
    valor_total NUMERIC(15,2), -- vNF
    protocolo TEXT,
    status TEXT CHECK (status IN ('importada', 'conferindo', 'finalizada', 'cancelada')) DEFAULT 'importada',
    xml_storage_path TEXT, -- caminho no bucket
    dados_brutos JSONB, -- Parse completo do XML para auditoria
    created_by UUID, -- Usuário que importou
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT notas_fiscais_entrada_chave_key UNIQUE (salao_id, chave_acesso)
);

-- 1.4 itens_nota_entrada
CREATE TABLE IF NOT EXISTS public.itens_nota_entrada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_entrada_id UUID NOT NULL REFERENCES public.notas_fiscais_entrada(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id), -- NULL até ser mapeado
    numero_item INTEGER, -- nItem
    codigo_fornecedor TEXT, -- cProd
    descricao TEXT, -- xProd
    ncm TEXT,
    cfop TEXT,
    ean TEXT,
    unidade_comercial TEXT, -- uCom
    quantidade_comercial NUMERIC(15,4), -- qCom
    valor_unitario_comercial NUMERIC(15,4), -- vUnCom
    valor_total_item NUMERIC(15,2), -- vProd
    desconto_item NUMERIC(15,2),
    custo_unitario_calculado NUMERIC(15,4), -- Preenchido no commit da entrada
    vinculado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1.5 duplicatas_entrada (Para integração com contas a pagar)
CREATE TABLE IF NOT EXISTS public.duplicatas_entrada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_entrada_id UUID NOT NULL REFERENCES public.notas_fiscais_entrada(id) ON DELETE CASCADE,
    numero_dup TEXT, -- nDup
    vencimento DATE, -- dVenc
    valor NUMERIC(15,2), -- vDup
    conta_pagar_id UUID, -- Referência à tabela contas_pagar (se existir)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Atualização da tabela de Produtos
-- Adicionar colunas necessárias caso não existam
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='ean') THEN
        ALTER TABLE public.produtos ADD COLUMN ean TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='ncm') THEN
        ALTER TABLE public.produtos ADD COLUMN ncm TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='custo_medio') THEN
        ALTER TABLE public.produtos ADD COLUMN custo_medio NUMERIC(15,4) DEFAULT 0;
    END IF;
END $$;

-- 3. Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_nota_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicatas_entrada ENABLE ROW LEVEL SECURITY;

-- Create Policies (Isolamento por Tenant usando a mesma lógica que outras tabelas)
CREATE POLICY tenant_isolation_fornecedores ON public.fornecedores
    FOR ALL USING (salao_id = (auth.jwt() ->> 'salao_id')::uuid);

CREATE POLICY tenant_isolation_produto_fornecedor ON public.produto_fornecedor
    FOR ALL USING (salao_id = (auth.jwt() ->> 'salao_id')::uuid);

CREATE POLICY tenant_isolation_notas_fiscais_entrada ON public.notas_fiscais_entrada
    FOR ALL USING (salao_id = (auth.jwt() ->> 'salao_id')::uuid);

-- Itens e Duplicatas não têm salao_id diretamente, acessam via nota_entrada_id
CREATE POLICY tenant_isolation_itens_nota_entrada ON public.itens_nota_entrada
    FOR ALL USING (
        nota_entrada_id IN (
            SELECT id FROM public.notas_fiscais_entrada 
            WHERE salao_id = (auth.jwt() ->> 'salao_id')::uuid
        )
    );

CREATE POLICY tenant_isolation_duplicatas_entrada ON public.duplicatas_entrada
    FOR ALL USING (
        nota_entrada_id IN (
            SELECT id FROM public.notas_fiscais_entrada 
            WHERE salao_id = (auth.jwt() ->> 'salao_id')::uuid
        )
    );

-- 4. RPC para Processar a Entrada Atômicamente
-- Esta função recebe um JSON com os dados da nota já mapeados e executa tudo em uma transação.
CREATE OR REPLACE FUNCTION public.processar_entrada_nfe(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_salao_id UUID;
    v_fornecedor_id UUID;
    v_nota_id UUID;
    v_fornecedor_data JSONB;
    v_nota_data JSONB;
    v_itens JSONB;
    v_duplicatas JSONB;
    v_item JSONB;
    v_dup JSONB;
    v_conta_id UUID;
    
    -- Variáveis de estoque e custo
    v_estoque_atual NUMERIC(15,4);
    v_custo_atual NUMERIC(15,4);
    v_qtd_interna NUMERIC(15,4);
    v_novo_custo_medio NUMERIC(15,4);
BEGIN
    -- Extrair dados principais
    v_salao_id := (payload->>'salao_id')::uuid;
    v_fornecedor_data := payload->'fornecedor';
    v_nota_data := payload->'nota';
    v_itens := payload->'itens';
    v_duplicatas := payload->'duplicatas';

    -- 1. Upsert Fornecedor
    INSERT INTO public.fornecedores (
        salao_id, tipo_pessoa, documento, razao_social, nome_fantasia, 
        inscricao_estadual, endereco_logradouro, endereco_numero, 
        endereco_bairro, endereco_municipio, endereco_uf, endereco_cep
    )
    VALUES (
        v_salao_id, 
        v_fornecedor_data->>'tipo_pessoa', 
        v_fornecedor_data->>'documento', 
        v_fornecedor_data->>'razao_social', 
        v_fornecedor_data->>'nome_fantasia',
        v_fornecedor_data->>'inscricao_estadual',
        v_fornecedor_data->>'endereco_logradouro',
        v_fornecedor_data->>'endereco_numero',
        v_fornecedor_data->>'endereco_bairro',
        v_fornecedor_data->>'endereco_municipio',
        v_fornecedor_data->>'endereco_uf',
        v_fornecedor_data->>'endereco_cep'
    )
    ON CONFLICT (salao_id, documento) DO UPDATE SET
        razao_social = EXCLUDED.razao_social,
        endereco_logradouro = EXCLUDED.endereco_logradouro,
        updated_at = timezone('utc'::text, now())
    RETURNING id INTO v_fornecedor_id;

    -- 2. Inserir Nota Fiscal (falha se já existir chave_acesso)
    INSERT INTO public.notas_fiscais_entrada (
        salao_id, fornecedor_id, chave_acesso, numero, serie, modelo,
        natureza_operacao, data_emissao, valor_produtos, valor_desconto,
        valor_frete, valor_outros, valor_total, protocolo, dados_brutos,
        status, xml_storage_path
    )
    VALUES (
        v_salao_id, v_fornecedor_id, v_nota_data->>'chave_acesso', 
        (v_nota_data->>'numero')::integer, (v_nota_data->>'serie')::integer, 
        COALESCE(v_nota_data->>'modelo', '55'), v_nota_data->>'natureza_operacao',
        (v_nota_data->>'data_emissao')::timestamptz, 
        (v_nota_data->>'valor_produtos')::numeric, (v_nota_data->>'valor_desconto')::numeric,
        (v_nota_data->>'valor_frete')::numeric, (v_nota_data->>'valor_outros')::numeric,
        (v_nota_data->>'valor_total')::numeric, v_nota_data->>'protocolo',
        v_nota_data->'dados_brutos', 'finalizada', v_nota_data->>'xml_storage_path'
    )
    RETURNING id INTO v_nota_id;

    -- 3. Processar Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens)
    LOOP
        -- Inserir o item na nota
        INSERT INTO public.itens_nota_entrada (
            nota_entrada_id, produto_id, numero_item, codigo_fornecedor,
            descricao, ncm, cfop, ean, unidade_comercial, quantidade_comercial,
            valor_unitario_comercial, valor_total_item, desconto_item, 
            custo_unitario_calculado, vinculado
        )
        VALUES (
            v_nota_id, (v_item->>'produto_id')::uuid, (v_item->>'numero_item')::integer,
            v_item->>'codigo_fornecedor', v_item->>'descricao', v_item->>'ncm',
            v_item->>'cfop', v_item->>'ean', v_item->>'unidade_comercial',
            (v_item->>'quantidade_comercial')::numeric, (v_item->>'valor_unitario_comercial')::numeric,
            (v_item->>'valor_total_item')::numeric, (v_item->>'desconto_item')::numeric,
            (v_item->>'custo_unitario_calculado')::numeric, true
        );

        -- Upsert no De-Para (produto_fornecedor)
        INSERT INTO public.produto_fornecedor (
            salao_id, produto_id, fornecedor_id, codigo_fornecedor,
            ean, unidade_compra, fator_conversao, ultimo_custo
        )
        VALUES (
            v_salao_id, (v_item->>'produto_id')::uuid, v_fornecedor_id, v_item->>'codigo_fornecedor',
            v_item->>'ean', v_item->>'unidade_comercial', (v_item->>'fator_conversao')::numeric,
            (v_item->>'custo_unitario_calculado')::numeric
        )
        ON CONFLICT (salao_id, fornecedor_id, codigo_fornecedor) DO UPDATE SET
            produto_id = EXCLUDED.produto_id,
            ultimo_custo = EXCLUDED.ultimo_custo,
            fator_conversao = EXCLUDED.fator_conversao,
            updated_at = timezone('utc'::text, now());

        -- Atualizar Estoque e Custo Médio
        SELECT estoque_atual, custo_medio INTO v_estoque_atual, v_custo_atual 
        FROM public.produtos WHERE id = (v_item->>'produto_id')::uuid;
        
        -- Default para caso seja null
        v_estoque_atual := COALESCE(v_estoque_atual, 0);
        v_custo_atual := COALESCE(v_custo_atual, 0);
        
        v_qtd_interna := (v_item->>'quantidade_comercial')::numeric * (v_item->>'fator_conversao')::numeric;
        
        -- Cálculo do Custo Médio Ponderado
        IF (v_estoque_atual + v_qtd_interna) > 0 THEN
            v_novo_custo_medio := ((v_estoque_atual * v_custo_atual) + (v_qtd_interna * (v_item->>'custo_unitario_calculado')::numeric)) / (v_estoque_atual + v_qtd_interna);
        ELSE
            v_novo_custo_medio := (v_item->>'custo_unitario_calculado')::numeric;
        END IF;

        UPDATE public.produtos 
        SET estoque_atual = v_estoque_atual + v_qtd_interna,
            custo_medio = v_novo_custo_medio,
            updated_at = timezone('utc'::text, now())
        WHERE id = (v_item->>'produto_id')::uuid;

        -- Opcional: Inserir em movimentacoes_estoque se a tabela existir
        -- INSERT INTO public.movimentacoes_estoque ...
    END LOOP;

    -- 4. Processar Duplicatas (Contas a Pagar)
    FOR v_dup IN SELECT * FROM jsonb_array_elements(v_duplicatas)
    LOOP
        -- Se existir a tabela contas_pagar_novo, insere.
        -- O sistema original usa 'caixa_movimentacoes' com status futuro, ou algo assim.
        -- Precisamos do nome correto da tabela de contas a pagar.
        -- Vamos deixar o insert de contas a pagar abstraído por enquanto ou ajustar depois 
        -- quando descobrirmos a tabela exata de contas a pagar do salão.
    END LOOP;

    RETURN jsonb_build_object('success', true, 'nota_entrada_id', v_nota_id);
EXCEPTION WHEN OTHERS THEN
    -- O Postgres fará o ROLLBACK automático
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$$;
