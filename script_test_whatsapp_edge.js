import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data: v_service_key_row } = await supabase
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', 'service_role_key')
    .single();

  const key = v_service_key_row ? v_service_key_row.decrypted_secret : process.env.VITE_SUPABASE_ANON_KEY;

  console.log("Calling Edge Function whatsapp-send...");
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      telefone: "5535999999999",
      mensagem: "Teste de envio API",
      tipo_mensagem: "confirmacao"
    })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test()
