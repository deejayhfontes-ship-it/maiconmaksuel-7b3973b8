import fetch from 'node-fetch';
import fs from 'fs';

const SUPABASE_URL = "https://hhzvjsrsoyhjzeiuxpep.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0";

async function run() {
  console.log("Buscando especificação OpenAPI da API do Supabase...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });
    
    const data = await res.json();
    fs.writeFileSync('swagger.json', JSON.stringify(data, null, 2));
    console.log("Swagger salvo com sucesso em swagger.json!");

    // Listar todos os RPCs (caminhos que começam com /rpc/)
    const paths = Object.keys(data.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log("RPCs disponíveis:", rpcs);
  } catch (e) {
    console.error("Erro:", e);
  }
}

run();
