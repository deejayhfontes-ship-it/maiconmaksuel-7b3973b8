import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

import { readFileSync } from 'fs'

const sql = readFileSync('./supabase/migrations/20260421_fix_whatsapp_trigger.sql', 'utf8')

// Divide o SQL em statements individuais para evitar erro de múltiplos statements
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function runSql(statement) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ sql_string: statement })
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function main() {
  console.log(`Executando migration via Supabase API...`)
  console.log(`URL: ${SUPABASE_URL}`)
  
  // Vamos tentar via REST API direto com a função do PostgreSQL
  // Na verdade precisamos de uma abordagem diferente
  // Vou checar se existe exec_sql
  const check = await runSql('SELECT 1 as ok')
  console.log('Check exec_sql existe:', check.status, check.body.substring(0, 100))
  
  if (check.status === 200 || check.status === 201) {
    console.log('exec_sql disponível! Aplicando migration...')
    for (const stmt of statements) {
      if (stmt.length < 3) continue
      const r = await runSql(stmt)
      if (r.status >= 400) {
        console.warn(`  [WARN] ${r.status}: ${r.body.substring(0, 150)}`)
      } else {
        console.log(`  [OK] ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`)
      }
    }
  } else {
    console.log('exec_sql não disponível (esperado). Migration precisa ser rodada manualmente no Supabase Dashboard.')
    console.log('Acesse: https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/sql/new')
    console.log('Cole e execute o arquivo: supabase/migrations/20260421_fix_whatsapp_trigger.sql')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
