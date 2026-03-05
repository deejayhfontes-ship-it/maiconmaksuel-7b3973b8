import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalEnviados = 0;
  const erros: string[] = [];

  try {
    // 1. Fetch active lembretes
    const { data: lembretes, error: lemErr } = await supabase
      .from("comunicacao_lembretes")
      .select("*")
      .eq("ativo", true);

    if (lemErr) throw lemErr;
    if (!lembretes || lembretes.length === 0) {
      console.log("[CHECK-LEMBRETES] Nenhum lembrete ativo");
      return new Response(JSON.stringify({ success: true, enviados: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();

    for (const lembrete of lembretes) {
      const horasAntes = lembrete.horas_antes || 24;

      // Window: agendamentos happening in [now + horasAntes - 1min, now + horasAntes + 1min]
      const windowCenter = new Date(now.getTime() + horasAntes * 60 * 60 * 1000);
      const windowStart = new Date(windowCenter.getTime() - 60 * 1000);
      const windowEnd = new Date(windowCenter.getTime() + 60 * 1000);

      console.log(`[CHECK-LEMBRETES] Lembrete "${lembrete.nome}" (${horasAntes}h antes), janela: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);

      // 2. Find matching agendamentos
      const { data: agendamentos, error: agErr } = await supabase
        .from("agendamentos")
        .select(`
          id, data_hora, status, lembrete_enviado,
          cliente_id, profissional_id, servico_id
        `)
        .gte("data_hora", windowStart.toISOString())
        .lte("data_hora", windowEnd.toISOString())
        .in("status", ["agendado", "confirmado"])
        .eq("lembrete_enviado", false);

      if (agErr) {
        console.error(`[CHECK-LEMBRETES] Erro ao buscar agendamentos:`, agErr);
        erros.push(`fetch_agendamentos: ${agErr.message}`);
        continue;
      }

      if (!agendamentos || agendamentos.length === 0) {
        console.log(`[CHECK-LEMBRETES] Nenhum agendamento na janela para "${lembrete.nome}"`);
        continue;
      }

      console.log(`[CHECK-LEMBRETES] ${agendamentos.length} agendamento(s) encontrado(s)`);

      for (const ag of agendamentos) {
        try {
          // 3. Fetch cliente
          const { data: cliente } = await supabase
            .from("clientes")
            .select("nome, celular")
            .eq("id", ag.cliente_id)
            .maybeSingle();

          if (!cliente || !cliente.celular) {
            console.warn(`[CHECK-LEMBRETES] Cliente ${ag.cliente_id} sem celular, pulando`);
            continue;
          }

          // 4. Fetch servico
          const { data: servico } = await supabase
            .from("servicos")
            .select("nome")
            .eq("id", ag.servico_id)
            .maybeSingle();

          // 5. Fetch profissional
          const { data: profissional } = await supabase
            .from("profissionais")
            .select("nome")
            .eq("id", ag.profissional_id)
            .maybeSingle();

          // 6. Build message from template
          const dataHora = new Date(ag.data_hora);
          const dia = String(dataHora.getDate()).padStart(2, "0");
          const mes = String(dataHora.getMonth() + 1).padStart(2, "0");
          const hora = String(dataHora.getHours()).padStart(2, "0");
          const minuto = String(dataHora.getMinutes()).padStart(2, "0");

          let mensagem = lembrete.template_mensagem || "Olá {{nome}}, lembrete do seu agendamento!";
          mensagem = mensagem
            .replace(/\{\{nome\}\}/g, cliente.nome)
            .replace(/\{nome\}/g, cliente.nome)
            .replace(/\{\{servico\}\}/g, servico?.nome || "serviço")
            .replace(/\{servico\}/g, servico?.nome || "serviço")
            .replace(/\{\{data\}\}/g, `${dia}/${mes}`)
            .replace(/\{data\}/g, `${dia}/${mes}`)
            .replace(/\{\{horario\}\}/g, `${hora}:${minuto}`)
            .replace(/\{horario\}/g, `${hora}:${minuto}`)
            .replace(/\{\{profissional\}\}/g, profissional?.nome || "")
            .replace(/\{profissional\}/g, profissional?.nome || "");

          console.log(`[CHECK-LEMBRETES] Enviando para ${cliente.nome} (${cliente.celular})`);

          // 7. Call whatsapp-send
          const sendRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              telefone: cliente.celular,
              mensagem,
              cliente_nome: cliente.nome,
            }),
          });

          const sendBody = await sendRes.text();
          console.log(`[CHECK-LEMBRETES] whatsapp-send response: ${sendRes.status} ${sendBody}`);

          // 8. Mark as sent
          const { error: updateErr } = await supabase
            .from("agendamentos")
            .update({ lembrete_enviado: true })
            .eq("id", ag.id);

          if (updateErr) {
            console.error(`[CHECK-LEMBRETES] Erro ao marcar lembrete_enviado:`, updateErr);
          }

          totalEnviados++;
        } catch (agError) {
          const msg = agError instanceof Error ? agError.message : String(agError);
          console.error(`[CHECK-LEMBRETES] Erro no agendamento ${ag.id}:`, msg);
          erros.push(`ag_${ag.id}: ${msg}`);
        }
      }
    }

    // 9. Update statistics
    if (totalEnviados > 0) {
      const today = new Date().toISOString().split("T")[0];
      const { data: stats } = await supabase
        .from("comunicacao_estatisticas")
        .select("*")
        .eq("data", today)
        .maybeSingle();

      if (stats) {
        await supabase
          .from("comunicacao_estatisticas")
          .update({ mensagens_enviadas: stats.mensagens_enviadas + totalEnviados })
          .eq("id", stats.id);
      } else {
        await supabase.from("comunicacao_estatisticas").insert([
          { data: today, mensagens_enviadas: totalEnviados },
        ]);
      }
    }

    console.log(`[CHECK-LEMBRETES] Finalizado. Enviados: ${totalEnviados}, Erros: ${erros.length}`);

    return new Response(
      JSON.stringify({ success: true, enviados: totalEnviados, erros }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-LEMBRETES] Erro fatal:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
