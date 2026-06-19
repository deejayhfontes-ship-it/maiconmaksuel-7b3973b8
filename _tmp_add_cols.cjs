// Usa supabase-js com service_role key para executar DDL via pg extension
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hhzvjsrsoyhjzeiuxpep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0NjQyNiwiZXhwIjoyMDgzNzIyNDI2fQ.GlGVDmEbr3xXkMBq5jIHxNf4YLSJ4i1jxELqGFhJt3o'
);

async function run() {
  console.log('Tentando criar colunas fiscais via service_role + .rpc()...\n');

  // Primeiro verificar se as colunas já existem
  const { data: cols, error: colErr } = await supabase
    .from('produtos')
    .select('*')
    .limit(1);

  if (colErr) {
    console.log('Erro ao ler produtos:', colErr.message);
    return;
  }

  const sample = cols?.[0];
  if (sample) {
    const hasNcm = 'ncm' in sample;
    console.log('Coluna ncm já existe?', hasNcm);
    if (hasNcm) {
      console.log('✅ Colunas fiscais já existem! Nada a fazer.');
      console.log('Amostra:', JSON.stringify(sample, null, 2));
      return;
    }
  }

  // Tentativas de DDL
  // 1. Via RPC (se existir exec_sql)
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', {
    sql_query: `ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm TEXT DEFAULT '00000000'`
  });
  
  if (!e1) {
    console.log('✅ exec_sql RPC funcionou!');
    // Adicionar demais colunas
    for (const col of [
      "ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102'",
      "ADD COLUMN IF NOT EXISTS cst_icms TEXT DEFAULT '00'",
      "ADD COLUMN IF NOT EXISTS csosn TEXT",
      "ADD COLUMN IF NOT EXISTS cest TEXT",
      "ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0'"
    ]) {
      await supabase.rpc('exec_sql', { sql_query: `ALTER TABLE produtos ${col}` });
    }
    console.log('✅ Todas as colunas criadas!');
  } else {
    console.log('exec_sql não disponível:', e1.message);
    console.log('\n❌ Não foi possível criar as colunas automaticamente.');
    console.log('\n📋 COPIE E EXECUTE NO SQL EDITOR DO SUPABASE:');
    console.log('   https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/sql/new');
    console.log('\n--- SQL ---');
    console.log(`ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm TEXT DEFAULT '00000000',
  ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS cst_icms TEXT DEFAULT '00',
  ADD COLUMN IF NOT EXISTS csosn TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';`);
    console.log('--- FIM ---');
  }
}

run().catch(console.error);
