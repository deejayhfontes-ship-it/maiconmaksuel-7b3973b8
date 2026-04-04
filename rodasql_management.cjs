const fs = require('fs');
const https = require('https');

const PAT = 'sbp_a1efd6232e48db3c84484cb743171c29cf1800fd';
const PROJECT_REF = 'hhzvjsrsoyhjzeiuxpep';

const SQL = `
CREATE TABLE IF NOT EXISTS atendimentos_auditoria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  uuid NOT NULL,
  numero_comanda  integer,
  acao            text NOT NULL,
  motivo          text NOT NULL,
  detalhes        jsonb,
  usuario_nome    text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_atendimento ON atendimentos_auditoria(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON atendimentos_auditoria(created_at DESC);
ALTER TABLE atendimentos_auditoria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'insert_auditoria'
  ) THEN
      CREATE POLICY "insert_auditoria" ON atendimentos_auditoria FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'atendimentos_auditoria' AND policyname = 'select_auditoria'
  ) THEN
      CREATE POLICY "select_auditoria" ON atendimentos_auditoria FOR SELECT USING (true);
  END IF;
END $$;
`;

const data = JSON.stringify({ query: SQL });

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ SUCESSO: Tabela de auditoria criada via API Management!');
        } else {
            console.log('❌ FALHA na criação da tabela.');
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
