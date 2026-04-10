const https = require('https');

const SUPABASE_URL = 'hhzvjsrsoyhjzeiuxpep.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0NjQyNiwiZXhwIjoyMDgzNzIyNDI2fQ.GlGVDmEbr3xXkMBq5jIHxNf4YLSJ4i1jxELqGFhJt3o';

const sql = `
CREATE TABLE IF NOT EXISTS pagamentos_comissao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id uuid REFERENCES profissionais(id),
  profissional_nome text NOT NULL,
  periodo_inicio timestamptz NOT NULL,
  periodo_fim timestamptz NOT NULL,
  valor_bruto numeric DEFAULT 0,
  valor_descontos numeric DEFAULT 0,
  valor_liquido numeric DEFAULT 0,
  qtd_itens integer DEFAULT 0,
  observacao text,
  usuario_nome text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pagamentos_comissao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'pagamentos_comissao' AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY allow_all ON pagamentos_comissao FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

const data = JSON.stringify({ query: sql });

const options = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Length': Buffer.byteLength(data),
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Tabela pagamentos_comissao criada com sucesso!');
    } else {
      console.log('Status:', res.statusCode);
      console.log('Resposta:', body);
      // Tentar via management API
      tentarManagementAPI();
    }
  });
});
req.on('error', e => {
  console.error('Erro:', e.message);
  tentarManagementAPI();
});
req.write(data);
req.end();

function tentarManagementAPI() {
  console.log('Tentando via Management API...');
  // Usar o PAT token salvo
  const pat = 'sbp_d0c8db58f9799b7309cc1a2b52ea6c0d4cbd8590';
  const payload = JSON.stringify({ query: sql });
  
  const opts = {
    hostname: 'api.supabase.com',
    path: '/v1/projects/hhzvjsrsoyhjzeiuxpep/database/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + pat,
      'Content-Length': Buffer.byteLength(payload),
    }
  };

  const r = https.request(opts, (res2) => {
    let b = '';
    res2.on('data', d => b += d);
    res2.on('end', () => {
      console.log('Management API Status:', res2.statusCode);
      console.log('Resposta:', b.substring(0, 500));
    });
  });
  r.on('error', e2 => console.error('Erro Management API:', e2.message));
  r.write(payload);
  r.end();
}
