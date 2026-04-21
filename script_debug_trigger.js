import dotenv from 'dotenv'
dotenv.config()

// Verifica whatsapp_logs sem filtro de agendamento_id para ver TODOS os pending
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function check() {
  // 1. Ver todos os logs recentes de whatsapp
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_logs?order=created_at.desc&limit=5`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  const logs = await r1.json()
  console.log("Últimos 5 logs WhatsApp:", JSON.stringify(logs, null, 2))

  // 2. Ver config do WhatsApp (sessao_ativa)
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/configuracoes_whatsapp?limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  const cfg = await r2.json()
  console.log("\nConfig WhatsApp:", JSON.stringify(cfg[0] ? {
    sessao_ativa: cfg[0].sessao_ativa,
    qrcode_conectado: cfg[0].qrcode_conectado,
    api_provider: cfg[0].api_provider,
    instance_id: cfg[0].instance_id ? '✅ preenchido' : '❌ vazio'
  } : 'VAZIO', null, 2))
}

check()
