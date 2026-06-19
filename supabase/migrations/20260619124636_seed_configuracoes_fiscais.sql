DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM configuracoes_fiscal LIMIT 1) THEN
    UPDATE configuracoes_fiscal SET
      empresa_razao_social = 'MAICON DOS SANTOS DA SILVA LTDA',
      empresa_nome_fantasia = 'MAICON MAKSUEL CONCEPT',
      cnpj = '40.714.062/0001-80',
      inscricao_estadual = '55568670056',
      endereco_uf = 'MG',
      regime_tributario = 'simples_nacional'
    WHERE id = (SELECT id FROM configuracoes_fiscal LIMIT 1);
  ELSE
    INSERT INTO configuracoes_fiscal (
      empresa_razao_social, empresa_nome_fantasia, cnpj, inscricao_estadual, endereco_uf, regime_tributario, ambiente, serie_nfe
    ) VALUES (
      'MAICON DOS SANTOS DA SILVA LTDA', 'MAICON MAKSUEL CONCEPT', '40.714.062/0001-80', '55568670056', 'MG', 'simples_nacional', 'homologacao', 1
    );
  END IF;
END $$;
