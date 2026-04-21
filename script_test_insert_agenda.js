import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  console.log("Inserindo agendamento teste...");
  
  const { data: cliente } = await supabase.from('clientes').select('id, nome, celular').neq('celular', '').limit(1);
  const { data: servico } = await supabase.from('servicos').select('id, duracao_minutos').limit(1);
  const { data: profissional } = await supabase.from('profissionais').select('id').limit(1);
  
  if(!cliente || !cliente[0]) {
    console.log("Nenhum cliente com celular encontrado");
    return;
  }

  const { data, error } = await supabase.from('agendamentos').insert({
    cliente_id: cliente[0].id,
    profissional_id: profissional[0].id,
    servico_id: servico[0].id,
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    status: 'agendado',
    duracao_minutos: servico[0].duracao_minutos || 30
  }).select();

  console.log("Insert result:", data);
  console.log("Insert error:", error);

  if (!data) return;

  await new Promise(r => setTimeout(r, 4000));

  const { data: logs } = await supabase.from('whatsapp_logs').select('*').eq('agendamento_id', data[0].id);
  console.log("Whatsapp Logs pro agendamento:", logs);

  await supabase.from('agendamentos').delete().eq('id', data[0].id);
  console.log("Cleanup done.");
}

test()
