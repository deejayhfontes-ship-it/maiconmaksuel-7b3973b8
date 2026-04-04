const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Maiconapp1010*@db.hhzvjsrsoyhjzeiuxpep.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log("Conectado ao Database Supabase via pg direto!");

    const sql = `
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

    await client.query(sql);
    console.log("🚀 TABELA DE AUDITORIA CRIADA COM SUCESSO!");

  } catch (err) {
    console.error("ERRO:", err.message);
  } finally {
    await client.end();
  }
}

run();
