#!/usr/bin/env node
// ============================================================
// aplicar_migration_auditoria.cjs
// Aplica a migration de snapshots de auditoria no Supabase
// Rodar: node aplicar_migration_auditoria.cjs
// ============================================================

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PROJECT_ID  = 'hhzvjsrsoyhjzeiuxpep';
const ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0';
const EMAIL       = 'maiconmaksuel35@gmail.com';
const PASSWORD    = 'Maiconapp1010*';

// SQL da migration
const SQL = `
ALTER TABLE atendimentos_auditoria
  ADD COLUMN IF NOT EXISTS motivo_categoria  text,
  ADD COLUMN IF NOT EXISTS status_anterior   text,
  ADD COLUMN IF NOT EXISTS status_novo       text,
  ADD COLUMN IF NOT EXISTS snapshot_antes    jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_depois   jsonb,
  ADD COLUMN IF NOT EXISTS usuario_id        text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Bloquear update auditoria') THEN
    EXECUTE 'CREATE POLICY "Bloquear update auditoria" ON atendimentos_auditoria FOR UPDATE USING (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Bloquear delete auditoria') THEN
    EXECUTE 'CREATE POLICY "Bloquear delete auditoria" ON atendimentos_auditoria FOR DELETE USING (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Permitir insert auditoria') THEN
    EXECUTE 'CREATE POLICY "Permitir insert auditoria" ON atendimentos_auditoria FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Permitir select auditoria') THEN
    EXECUTE 'CREATE POLICY "Permitir select auditoria" ON atendimentos_auditoria FOR SELECT USING (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auditoria_acao      ON atendimentos_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_categoria ON atendimentos_auditoria(motivo_categoria);
`;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔐 Fazendo login no Supabase...');
  const loginBody = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const loginRes = await request({
    hostname: `${PROJECT_ID}.supabase.co`,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody),
    },
  }, loginBody);

  if (!loginRes.body.access_token) {
    console.error('❌ Falha no login:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.access_token;
  console.log('✅ Login OK!\n');

  console.log('⚡ Verificando estrutura atual da tabela...');
  const checkRes = await request({
    hostname: `${PROJECT_ID}.supabase.co`,
    path: '/rest/v1/atendimentos_auditoria?limit=0',
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (checkRes.status !== 200) {
    console.error('❌ Tabela não encontrada. Execute primeiro create_auditoria_comandas.sql');
    process.exit(1);
  }
  console.log('✅ Tabela existe!\n');

  // Aplicar via Edge Function rpc ou SQL direto
  console.log('📋 Aplicando migration via SQL...');
  console.log('\n⚠️  A migration precisa ser aplicada manualmente no SQL Editor do Supabase:');
  console.log('   👉 https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/sql/new');
  console.log('\n📄 Cole o conteúdo do arquivo:');
  console.log('   supabase/migrations/upgrade_auditoria_snapshots.sql\n');
  
  // Salvar SQL em arquivo separado para fácil cópia
  const sqlPath = path.join(__dirname, 'migration_para_rodar.sql');
  fs.writeFileSync(sqlPath, SQL.trim());
  console.log(`✅ SQL salvo em: ${sqlPath}`);
  console.log('\nColunas que serão adicionadas:');
  console.log('  • motivo_categoria (text)');
  console.log('  • status_anterior  (text)');
  console.log('  • status_novo      (text)');
  console.log('  • snapshot_antes   (jsonb)');
  console.log('  • snapshot_depois  (jsonb)');
  console.log('  • usuario_id       (text)');
  console.log('\nPolicies RLS que serão criadas:');
  console.log('  🔒 Bloquear update auditoria');
  console.log('  🔒 Bloquear delete auditoria');
}

main().catch(console.error);
