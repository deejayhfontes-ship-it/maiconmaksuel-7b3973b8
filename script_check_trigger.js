import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  // Querying pg_trigger is not easily doable from API keys unless RPC is used or we can't!
  // I will just read all migrations in the supabase remote DB to see if `enviar_confirmacao_agendamento` was applied.
  // Actually, I can just use a raw API call to check if com_lembretes has any rows or causes errors.
  const { data, error } = await supabase.from('comunicacao_lembretes').select('*').limit(1);
  console.log("comunicacao_lembretes:", data, "error:", error);
}
test()
