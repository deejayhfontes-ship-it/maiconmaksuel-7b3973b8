-- Consolidar tabela de itens NF: código usa itens_nota_fiscal, mas migration antiga
-- criou notas_fiscais_itens. Se a tabela estiver vazia, remover (sem dados a perder).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notas_fiscais_itens' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM public.notas_fiscais_itens LIMIT 1) THEN
      DROP TABLE IF EXISTS public.notas_fiscais_itens CASCADE;
      RAISE NOTICE 'Tabela notas_fiscais_itens removida (estava vazia, código usa itens_nota_fiscal)';
    ELSE
      RAISE NOTICE 'Tabela notas_fiscais_itens tem dados — mantida para segurança';
    END IF;
  END IF;
END $$;
