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

  try {
    const payload = await req.json();
    console.log("[WEBHOOK] Payload recebido:", JSON.stringify(payload).substring(0, 500));

    // Extract sender and message from Evolution API webhook formats
    let numeroRemetente = "";
    let textoMensagem = "";

    // Evolution API v2 format
    if (payload.data?.key?.remoteJid) {
      numeroRemetente = payload.data.key.remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
      textoMensagem = payload.data?.message?.conversation
        || payload.data?.message?.extendedTextMessage?.text
        || "";
    }
    // Evolution API v1 / alternative format
    else if (payload.sender || payload.from) {
      numeroRemetente = (payload.sender || payload.from || "").replace("@s.whatsapp.net", "");
      textoMensagem = payload.body || payload.text || payload.message || "";
    }
    // Generic fallback
    else if (payload.messages?.[0]) {
      const msg = payload.messages[0];
      numeroRemetente = msg.from || msg.sender || "";
      textoMensagem = msg.text?.body || msg.body || "";
    }

    if (!numeroRemetente || !textoMensagem) {
      console.log("[WEBHOOK] Sem remetente ou mensagem, ignorando");
      return new Response(JSON.stringify({ ok: true, action: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize
    numeroRemetente = numeroRemetente.replace(/\D/g, "");
    textoMensagem = textoMensagem.trim();
    const palavrasRecebidas = textoMensagem.toLowerCase().split(/\s+/);

    console.log(`[WEBHOOK] De: ${numeroRemetente}, Msg: "${textoMensagem}"`);

    // === CHECK FOR CONFIRMATION RESPONSES (SIM/NÃO) ===
    const textoLower = textoMensagem.toLowerCase().trim();
    const isConfirmacao = ["sim", "s", "confirmo", "confirmar"].includes(textoLower);
    const isCancelamento = ["nao", "não", "n", "cancelar", "cancelo"].includes(textoLower);

    if (isConfirmacao || isCancelamento) {
      // Find pending confirmation for this phone number
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id")
        .eq("celular", numeroRemetente)
        .maybeSingle();

      if (!cliente) {
        // Try with 55 prefix
        const { data: cliente55 } = await supabase
          .from("clientes")
          .select("id")
          .or(`celular.eq.55${numeroRemetente},celular.eq.${numeroRemetente}`)
          .maybeSingle();

        if (cliente55) {
          // Find pending confirmation
          const { data: confirmacao } = await supabase
            .from("confirmacoes_agendamento")
            .select("id, agendamento_id")
            .eq("status", "pendente")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (confirmacao) {
            // Check if the agendamento belongs to this client
            const { data: agendamento } = await supabase
              .from("agendamentos")
              .select("id")
              .eq("id", confirmacao.agendamento_id)
              .eq("cliente_id", cliente55.id)
              .maybeSingle();

            if (agendamento) {
              if (isConfirmacao) {
                await supabase
                  .from("confirmacoes_agendamento")
                  .update({ status: "confirmado", confirmado_em: new Date().toISOString() })
                  .eq("id", confirmacao.id);
                await supabase
                  .from("agendamentos")
                  .update({ status: "confirmado" })
                  .eq("id", confirmacao.agendamento_id);
              } else {
                await supabase
                  .from("confirmacoes_agendamento")
                  .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
                  .eq("id", confirmacao.id);
                await supabase
                  .from("agendamentos")
                  .update({ status: "cancelado" })
                  .eq("id", confirmacao.agendamento_id);
              }

              const resposta = isConfirmacao
                ? "✅ Seu agendamento foi confirmado! Até lá!"
                : "❌ Seu agendamento foi cancelado. Caso queira reagendar, entre em contato.";

              await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ telefone: numeroRemetente, mensagem: resposta }),
              });

              // Update statistics
              const today = new Date().toISOString().split("T")[0];
              const statField = isConfirmacao ? "agendamentos_confirmados" : "agendamentos_cancelados";
              const { data: stats } = await supabase
                .from("comunicacao_estatisticas")
                .select("*")
                .eq("data", today)
                .maybeSingle();

              if (stats) {
                await supabase
                  .from("comunicacao_estatisticas")
                  .update({ [statField]: (stats[statField] || 0) + 1 })
                  .eq("id", stats.id);
              } else {
                await supabase
                  .from("comunicacao_estatisticas")
                  .insert([{ data: today, [statField]: 1 }]);
              }

              return new Response(
                JSON.stringify({ ok: true, action: isConfirmacao ? "confirmed" : "cancelled" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      } else {
        // Client found directly
        const { data: confirmacao } = await supabase
          .from("confirmacoes_agendamento")
          .select("id, agendamento_id, agendamentos!inner(cliente_id)")
          .eq("status", "pendente")
          .eq("agendamentos.cliente_id", cliente.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (confirmacao) {
          if (isConfirmacao) {
            await supabase
              .from("confirmacoes_agendamento")
              .update({ status: "confirmado", confirmado_em: new Date().toISOString() })
              .eq("id", confirmacao.id);
            await supabase
              .from("agendamentos")
              .update({ status: "confirmado" })
              .eq("id", confirmacao.agendamento_id);
          } else {
            await supabase
              .from("confirmacoes_agendamento")
              .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
              .eq("id", confirmacao.id);
            await supabase
              .from("agendamentos")
              .update({ status: "cancelado" })
              .eq("id", confirmacao.agendamento_id);
          }

          const resposta = isConfirmacao
            ? "✅ Seu agendamento foi confirmado! Até lá!"
            : "❌ Seu agendamento foi cancelado. Caso queira reagendar, entre em contato.";

          await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ telefone: numeroRemetente, mensagem: resposta }),
          });

          const today = new Date().toISOString().split("T")[0];
          const statField = isConfirmacao ? "agendamentos_confirmados" : "agendamentos_cancelados";
          const { data: stats } = await supabase
            .from("comunicacao_estatisticas")
            .select("*")
            .eq("data", today)
            .maybeSingle();

          if (stats) {
            await supabase
              .from("comunicacao_estatisticas")
              .update({ [statField]: (stats[statField] || 0) + 1 })
              .eq("id", stats.id);
          } else {
            await supabase
              .from("comunicacao_estatisticas")
              .insert([{ data: today, [statField]: 1 }]);
          }

          return new Response(
            JSON.stringify({ ok: true, action: isConfirmacao ? "confirmed" : "cancelled" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fetch active auto-responses ordered by priority
    const { data: respostas, error: respErr } = await supabase
      .from("comunicacao_respostas_automaticas")
      .select("*")
      .eq("ativo", true)
      .order("prioridade", { ascending: false });

    if (respErr) {
      console.error("[WEBHOOK] Erro ao buscar respostas:", respErr);
      throw respErr;
    }

    // Find matching response
    let matched: typeof respostas extends (infer T)[] ? T : never | null = null;

    if (respostas && respostas.length > 0) {
      for (const resp of respostas) {
        const keywords: string[] = resp.palavras_chave || [];
        const hasMatch = keywords.some((kw) =>
          palavrasRecebidas.some((p) => p.includes(kw.toLowerCase()))
        );
        if (hasMatch) {
          matched = resp;
          break;
        }
      }

      // Fallback: use highest priority or "padrao" type
      if (!matched) {
        matched = respostas.find((r) => r.tipo_resposta === "padrao") || respostas[0];
      }
    }

    if (!matched) {
      console.log("[WEBHOOK] Nenhuma resposta configurada");
      return new Response(JSON.stringify({ ok: true, action: "no_responses_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build response message based on type
    let mensagemResposta = matched.mensagem_resposta || "Obrigado pela sua mensagem!";

    switch (matched.tipo_resposta) {
      case "link_agendamento": {
        // Append booking link
        mensagemResposta += "\n\n📅 Agende aqui: https://maiconmaksuel.lovable.app/confirmar-agendamento";
        break;
      }

      case "tabela_servicos": {
        const { data: servicos } = await supabase
          .from("servicos")
          .select("nome, preco, duracao_minutos")
          .eq("ativo", true)
          .order("nome")
          .limit(15);

        if (servicos && servicos.length > 0) {
          mensagemResposta += "\n\n💇 *Nossos Serviços:*\n";
          for (const s of servicos) {
            const preco = s.preco ? `R$ ${Number(s.preco).toFixed(2)}` : "Consulte";
            const duracao = s.duracao_minutos ? `${s.duracao_minutos}min` : "";
            mensagemResposta += `\n• ${s.nome} — ${preco} ${duracao ? `(${duracao})` : ""}`;
          }
        }
        break;
      }

      case "localizacao": {
        const { data: salon } = await supabase
          .from("configuracoes_salao")
          .select("nome_salao, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep")
          .maybeSingle();

        if (salon) {
          const parts = [
            salon.endereco_logradouro,
            salon.endereco_numero,
            salon.endereco_bairro,
            salon.endereco_cidade,
            salon.endereco_estado,
            salon.endereco_cep,
          ].filter(Boolean);
          mensagemResposta += `\n\n📍 *${salon.nome_salao || "Nosso endereço"}*\n${parts.join(", ")}`;
        }
        break;
      }

      case "confirmacao_agendamento": {
        // Find next pending appointment for this phone
        const { data: agendamento } = await supabase
          .from("agendamentos")
          .select("id, data_hora, status")
          .eq("status", "agendado")
          .gte("data_hora", new Date().toISOString())
          .order("data_hora", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (agendamento) {
          await supabase
            .from("agendamentos")
            .update({ status: "confirmado" })
            .eq("id", agendamento.id);
          mensagemResposta += "\n\n✅ Seu agendamento foi confirmado!";
        } else {
          mensagemResposta += "\n\nNão encontrei agendamento pendente para confirmar.";
        }
        break;
      }

      case "cancelar_agendamento": {
        const { data: agendamento } = await supabase
          .from("agendamentos")
          .select("id, data_hora, status")
          .in("status", ["agendado", "confirmado"])
          .gte("data_hora", new Date().toISOString())
          .order("data_hora", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (agendamento) {
          await supabase
            .from("agendamentos")
            .update({ status: "cancelado" })
            .eq("id", agendamento.id);
          mensagemResposta += "\n\n❌ Seu agendamento foi cancelado.";
        } else {
          mensagemResposta += "\n\nNão encontrei agendamento para cancelar.";
        }
        break;
      }

      case "marcar_pendente": {
        mensagemResposta += "\n\n⏳ Sua solicitação foi registrada. Entraremos em contato em breve!";
        break;
      }

      case "horarios": {
        const { data: sysConfig } = await supabase
          .from("configuracoes_sistema")
          .select("agenda_horario_inicio, agenda_horario_fim, agenda_intervalo_minutos")
          .maybeSingle();

        if (sysConfig) {
          mensagemResposta += `\n\n🕐 *Horários de atendimento:*\n${sysConfig.agenda_horario_inicio || "08:00"} às ${sysConfig.agenda_horario_fim || "18:00"}`;
        }
        break;
      }

      default:
        // Use message as-is
        break;
    }

    // Send response via whatsapp-send
    console.log(`[WEBHOOK] Respondendo para ${numeroRemetente}: tipo=${matched.tipo_resposta}`);

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        telefone: numeroRemetente,
        mensagem: mensagemResposta,
      }),
    });

    const sendBody = await sendRes.text();
    console.log(`[WEBHOOK] whatsapp-send response: ${sendRes.status} ${sendBody}`);

    // Update statistics
    const today = new Date().toISOString().split("T")[0];
    const { data: stats } = await supabase
      .from("comunicacao_estatisticas")
      .select("*")
      .eq("data", today)
      .maybeSingle();

    if (stats) {
      await supabase
        .from("comunicacao_estatisticas")
        .update({ mensagens_respondidas: (stats.mensagens_respondidas || 0) + 1 })
        .eq("id", stats.id);
    } else {
      await supabase
        .from("comunicacao_estatisticas")
        .insert([{ data: today, mensagens_respondidas: 1 }]);
    }

    return new Response(
      JSON.stringify({ ok: true, tipo_resposta: matched.tipo_resposta }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK] Erro:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
