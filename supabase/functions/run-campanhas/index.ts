import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInSilenceWindow(config: { horario_silencio_inicio: string; horario_silencio_fim: string } | null): boolean {
  if (!config) return false;
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  const current = hh * 60 + mm;

  const [si_h, si_m] = config.horario_silencio_inicio.split(":").map(Number);
  const [sf_h, sf_m] = config.horario_silencio_fim.split(":").map(Number);
  const silStart = si_h * 60 + si_m;
  const silEnd = sf_h * 60 + sf_m;

  // e.g. silence from 21:00 to 08:00
  if (silStart > silEnd) {
    return current >= silStart || current < silEnd;
  }
  return current >= silStart && current < silEnd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalEnviados = 0;
  let totalSkipped = 0;
  const erros: string[] = [];

  try {
    // Check silence window
    const { data: configAvancadas } = await supabase
      .from("comunicacao_config_avancadas")
      .select("horario_silencio_inicio, horario_silencio_fim, limite_diario_mensagens")
      .maybeSingle();

    if (isInSilenceWindow(configAvancadas)) {
      console.log("[RUN-CAMPANHAS] Dentro do horário de silêncio, abortando");
      return new Response(
        JSON.stringify({ success: true, enviados: 0, message: "Horário de silêncio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limiteDiario = configAvancadas?.limite_diario_mensagens || 500;

    // Check how many already sent today
    const today = new Date().toISOString().split("T")[0];
    const { data: statsHoje } = await supabase
      .from("comunicacao_estatisticas")
      .select("mensagens_enviadas")
      .eq("data", today)
      .maybeSingle();

    let enviadasHoje = statsHoje?.mensagens_enviadas || 0;

    // Fetch active campaigns
    const { data: campanhas, error: campErr } = await supabase
      .from("comunicacao_campanhas")
      .select("*")
      .eq("ativo", true);

    if (campErr) throw campErr;
    if (!campanhas || campanhas.length === 0) {
      console.log("[RUN-CAMPANHAS] Nenhuma campanha ativa");
      return new Response(
        JSON.stringify({ success: true, enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const campanha of campanhas) {
      console.log(`[RUN-CAMPANHAS] Processando campanha "${campanha.nome}" (${campanha.tipo_segmentacao})`);

      let clientes: { id: string; nome: string; celular: string }[] = [];

      try {
        const diasInativo = campanha.criterio_dias_inativo || 30;

        switch (campanha.tipo_segmentacao) {
          case "reativacao": {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - diasInativo);
            const { data } = await supabase
              .from("clientes")
              .select("id, nome, celular")
              .eq("ativo", true)
              .eq("receber_mensagens", true)
              .lt("ultima_visita", cutoff.toISOString())
              .not("celular", "is", null);
            clientes = (data || []).filter((c) => c.celular);
            break;
          }

          case "aniversariantes": {
            const mesAtual = new Date().getMonth() + 1;
            const mesStr = String(mesAtual).padStart(2, "0");
            // Filter birthdays in current month using pattern match on date string
            const { data } = await supabase
              .from("clientes")
              .select("id, nome, celular, data_nascimento")
              .eq("ativo", true)
              .eq("receber_mensagens", true)
              .not("data_nascimento", "is", null)
              .not("celular", "is", null);
            clientes = (data || []).filter((c) => {
              if (!c.celular || !c.data_nascimento) return false;
              // data_nascimento format: YYYY-MM-DD
              const parts = c.data_nascimento.split("-");
              return parts[1] === mesStr;
            });
            break;
          }

          case "vip": {
            const minVisitas = 5;
            const { data } = await supabase
              .from("clientes")
              .select("id, nome, celular")
              .eq("ativo", true)
              .eq("receber_mensagens", true)
              .gte("total_visitas", minVisitas)
              .not("celular", "is", null);
            clientes = (data || []).filter((c) => c.celular);
            break;
          }

          case "reconquista": {
            // Clients whose last appointment was cancelled in the last N days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - diasInativo);
            const { data: agCancelados } = await supabase
              .from("agendamentos")
              .select("cliente_id")
              .eq("status", "cancelado")
              .gte("data_hora", cutoff.toISOString());

            if (agCancelados && agCancelados.length > 0) {
              const clienteIds = [...new Set(agCancelados.map((a) => a.cliente_id))];
              const { data } = await supabase
                .from("clientes")
                .select("id, nome, celular")
                .eq("ativo", true)
                .eq("receber_mensagens", true)
                .in("id", clienteIds)
                .not("celular", "is", null);
              clientes = (data || []).filter((c) => c.celular);
            }
            break;
          }

          default:
            console.warn(`[RUN-CAMPANHAS] Tipo desconhecido: ${campanha.tipo_segmentacao}`);
            continue;
        }
      } catch (segErr) {
        const msg = segErr instanceof Error ? segErr.message : String(segErr);
        console.error(`[RUN-CAMPANHAS] Erro na segmentação:`, msg);
        erros.push(`seg_${campanha.id}: ${msg}`);
        continue;
      }

      console.log(`[RUN-CAMPANHAS] ${clientes.length} cliente(s) segmentado(s) para "${campanha.nome}"`);

      let campanhaEnviados = 0;

      for (const cliente of clientes) {
        // Check daily limit
        if (enviadasHoje >= limiteDiario) {
          console.log("[RUN-CAMPANHAS] Limite diário atingido, parando");
          totalSkipped += clientes.length - campanhaEnviados;
          break;
        }

        // Re-check silence window between sends
        if (isInSilenceWindow(configAvancadas)) {
          console.log("[RUN-CAMPANHAS] Entrou no horário de silêncio, parando");
          totalSkipped += clientes.length - campanhaEnviados;
          break;
        }

        try {
          // Build message
          let mensagem = campanha.template_mensagem || "Olá {{nome}}!";
          mensagem = mensagem
            .replace(/\{\{nome\}\}/g, cliente.nome)
            .replace(/\{nome\}/g, cliente.nome)
            .replace(/\{\{primeiro_nome\}\}/g, cliente.nome.split(" ")[0])
            .replace(/\{primeiro_nome\}/g, cliente.nome.split(" ")[0])
            .replace(/\{\{empresa\}\}/g, "Maicon Maksuel")
            .replace(/\{empresa\}/g, "Maicon Maksuel")
            .replace(/\{\{salon_name\}\}/g, "Maicon Maksuel")
            .replace(/\{salon_name\}/g, "Maicon Maksuel")
            .replace(/\{\{cupom\}\}/g, campanha.desconto_oferecido ? `${campanha.desconto_oferecido}%OFF` : "");

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
          console.log(`[RUN-CAMPANHAS] Enviado para ${cliente.nome}: ${sendRes.status}`);

          if (sendRes.ok) {
            campanhaEnviados++;
            totalEnviados++;
            enviadasHoje++;
          } else {
            erros.push(`send_${cliente.id}: ${sendBody}`);
          }

          // Delay between messages (2 seconds to avoid spam)
          await sleep(2000);
        } catch (sendErr) {
          const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          erros.push(`send_${cliente.id}: ${msg}`);
        }
      }

      // Update campaign stats
      if (campanhaEnviados > 0) {
        await supabase
          .from("comunicacao_campanhas")
          .update({ total_enviados: (campanha.total_enviados || 0) + campanhaEnviados })
          .eq("id", campanha.id);
      }
    }

    // Update daily statistics
    if (totalEnviados > 0) {
      if (statsHoje) {
        await supabase
          .from("comunicacao_estatisticas")
          .update({ mensagens_enviadas: (statsHoje.mensagens_enviadas || 0) + totalEnviados })
          .eq("data", today);
      } else {
        await supabase
          .from("comunicacao_estatisticas")
          .insert([{ data: today, mensagens_enviadas: totalEnviados }]);
      }
    }

    console.log(`[RUN-CAMPANHAS] Finalizado. Enviados: ${totalEnviados}, Skipped: ${totalSkipped}, Erros: ${erros.length}`);

    return new Response(
      JSON.stringify({ success: true, enviados: totalEnviados, skipped: totalSkipped, erros }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RUN-CAMPANHAS] Erro fatal:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
