-- Corrige RLS das tabelas de compras (entrada de NF).
--
-- Problema: as tabelas foram criadas com policies de tenant_isolation que exigem
-- a claim `auth.jwt() ->> 'salao_id'`. Este app é single-tenant e roda na chave
-- anônima do Supabase (sem login), então essa claim nunca existe: as policies
-- nunca casam e BLOQUEIAM a leitura do histórico de entradas (a gravação passava
-- por ser SECURITY DEFINER na RPC, mas a leitura direta ficava vazia).
--
-- Solução: substituir por policies permissivas `USING (true)`, exatamente como
-- as demais tabelas do app (clientes, produtos, agendamentos...). A segurança
-- deste sistema é na camada de app/rede, não no RLS por tenant.

-- fornecedores
DROP POLICY IF EXISTS tenant_isolation_fornecedores ON public.fornecedores;
CREATE POLICY compras_anon_fornecedores ON public.fornecedores
    FOR ALL USING (true) WITH CHECK (true);

-- produto_fornecedor
DROP POLICY IF EXISTS tenant_isolation_produto_fornecedor ON public.produto_fornecedor;
CREATE POLICY compras_anon_produto_fornecedor ON public.produto_fornecedor
    FOR ALL USING (true) WITH CHECK (true);

-- notas_fiscais_entrada
DROP POLICY IF EXISTS tenant_isolation_notas_fiscais_entrada ON public.notas_fiscais_entrada;
CREATE POLICY compras_anon_notas_fiscais_entrada ON public.notas_fiscais_entrada
    FOR ALL USING (true) WITH CHECK (true);

-- itens_nota_entrada
DROP POLICY IF EXISTS tenant_isolation_itens_nota_entrada ON public.itens_nota_entrada;
CREATE POLICY compras_anon_itens_nota_entrada ON public.itens_nota_entrada
    FOR ALL USING (true) WITH CHECK (true);

-- duplicatas_entrada
DROP POLICY IF EXISTS tenant_isolation_duplicatas_entrada ON public.duplicatas_entrada;
CREATE POLICY compras_anon_duplicatas_entrada ON public.duplicatas_entrada
    FOR ALL USING (true) WITH CHECK (true);
