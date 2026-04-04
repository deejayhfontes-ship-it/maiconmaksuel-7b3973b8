const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTriggers() {
  console.log("Checando triggers de webhooks...");
  // Use edge functions or webhooks API? Em Supabase webhooks de tabela viram triggers 'net.http_request'
  const { data, error } = await supabase.rpc('get_triggers'); // Isso não existe por padrao
  console.log("API anonima nao permitira ler pg_trigger facilmente. Faremos via codigo DDL no rodasql_management.cjs.");
}

checkTriggers();
