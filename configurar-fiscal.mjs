import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hhzvjsrsoyhjzeiuxpep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
);

async function run() {
  console.log("Verificando se já existem configurações fiscais...");
  const { data: configs, error: getErr } = await supabase
    .from('configuracoes_fiscal')
    .select('*');

  if (getErr) {
    console.error("Erro ao buscar configurações:", getErr.message);
    process.exit(1);
  }

  const payload = {
    empresa_razao_social: 'MAICON DOS SANTOS DA SILVA LTDA',
    empresa_nome_fantasia: 'MAICON MAKSUEL CONCEPT',
    cnpj: '40.714.062/0001-80',
    inscricao_estadual: '55568670056',
    endereco_uf: 'MG',
    regime_tributario: '1', // Normalmente '1' é simples nacional na Focus, ou string
    ambiente: '2', // 2 é homologação, 1 é produção
    serie_nfe: 1,
    serie_nfce: 1,
    auto_emitir_cpf: true,
    auto_emitir_cnpj: true,
    api_provider: 'focus_nfe',
    // Usar o token padrão da Focus NFe
    api_token: 'lkrQudtneLTJ7Ojz1ZzViyM9Q5GF2ddz',
    csc_id: '000001',
    csc_token: 'COLE_O_TOKEN_CSC_AQUI'
  };

  if (configs && configs.length > 0) {
    console.log("Atualizando registro existente...");
    const { data, error } = await supabase
      .from('configuracoes_fiscal')
      .update(payload)
      .eq('id', configs[0].id)
      .select();

    if (error) {
      console.error("Erro ao atualizar:", error.message);
    } else {
      console.log("Configuração atualizada com sucesso:", data);
    }
  } else {
    console.log("Inserindo novo registro...");
    const { data, error } = await supabase
      .from('configuracoes_fiscal')
      .insert([payload])
      .select();

    if (error) {
      console.error("Erro ao inserir:", error.message);
    } else {
      console.log("Configuração inserida com sucesso:", data);
    }
  }
}

run();
