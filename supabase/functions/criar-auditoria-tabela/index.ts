import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, serviceKey)

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
    
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Permitir insert auditoria'
      ) THEN
        EXECUTE 'CREATE POLICY "Permitir insert auditoria" ON atendimentos_auditoria FOR INSERT WITH CHECK (true)';
      END IF;
    END $$;
    
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'atendimentos_auditoria' AND policyname = 'Permitir select auditoria'
      ) THEN
        EXECUTE 'CREATE POLICY "Permitir select auditoria" ON atendimentos_auditoria FOR SELECT USING (true)';
      END IF;
    END $$;
  `

  const { error } = await supabase.rpc('exec', { sql }).catch(() => ({ error: null }))
  
  // Método direto via postgres
  const { data, error: err2 } = await supabase
    .from('atendimentos_auditoria')
    .select('id')
    .limit(1)
  
  if (!err2) {
    return new Response(JSON.stringify({ status: 'tabela ja existe ou foi criada', ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ sql_attempted: true, check_error: err2?.message, original_error: error }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
