import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("[POS-ATENDIMENTO] Iniciando verificação...");

    // 1. Buscar todas as configurações ativas
    const { data: configs, error: cfgErr } = await supabase
      .from("comunicacao_pos_atendimento")
      .select("*")
      .eq("ativo", true);

    if (cfgErr) throw cfgErr;
    if (!configs || configs.length === 0) {
      console.log("[POS-ATENDIMENTO] Nenhuma configuração ativa");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar nome do salão
    const { data: salon } = await supabase
      .from("configuracoes_salao")
      .select("nome_salao")
      .maybeSingle();

    const empresaNome = salon?.nome_salao || "Nosso Salão";
    const now = new Date();
    const diaSemana = now.getDay() === 0 ? 7 : now.getDay(); // 1=seg, 7=dom
    let totalProcessados = 0;

    for (const config of configs) {
      // Verificar dia da semana
      if (!config.dias_da_semana?.includes(diaSemana)) {
        continue;
      }

      // 3. Calcular janela de tempo
      const minutosAtras = new Date(now.getTime() - config.enviar_apos_minutos * 60 * 1000);
      // Janela: atendimentos finalizados entre (enviar_apos_minutos + 10min) atrás e enviar_apos_minutos atrás
      const janelaInicio = new Date(minutosAtras.getTime() - 10 * 60 * 1000);

      // 4. Buscar atendimentos elegíveis
      const { data: atendimentos, error: atErr } = await supabase
        .from("atendimentos")
        .select(`
          id, cliente_id, updated_at,
          atendimento_servicos (
            servico_id,
            profissional_id,
            servicos:servico_id (nome),
            profissionais:profissional_id (nome)
          )
        `)
        .in("status", ["concluido", "finalizado", "fechado"])
        .eq("pos_atendimento_enviado", false)
        .not("cliente_id", "is", null)
        .gte("updated_at", janelaInicio.toISOString())
        .lte("updated_at", minutosAtras.toISOString())
        .limit(50);

      if (atErr) {
        console.error("[POS-ATENDIMENTO] Erro ao buscar atendimentos:", atErr);
        continue;
      }

      if (!atendimentos || atendimentos.length === 0) continue;

      for (const atendimento of atendimentos) {
        try {
          // 5. Buscar dados do cliente
          const { data: cliente } = await supabase
            .from("clientes")
            .select("nome, celular, receber_mensagens")
            .eq("id", atendimento.cliente_id)
            .single();

          if (!cliente?.celular || !cliente.receber_mensagens) continue;

          // 6. Montar mensagem
          const servicos = (atendimento as any).atendimento_servicos || [];
          const servicoNome = servicos[0]?.servicos?.nome || "atendimento";
          const profNome = servicos[0]?.profissionais?.nome || "";
          const dataFormatada = new Date(atendimento.updated_at).toLocaleDateString("pt-BR");

          let mensagem = config.template_mensagem;
          mensagem = mensagem.replace(/\{\{nome\}\}/g, cliente.nome || "");
          mensagem = mensagem.replace(/\{\{servico\}\}/g, servicoNome);
          mensagem = mensagem.replace(/\{\{profissional\}\}/g, profNome);
          mensagem = mensagem.replace(/\{\{data\}\}/g, dataFormatada);
          mensagem = mensagem.replace(/\{\{empresa\}\}/g, empresaNome);
          mensagem = mensagem.replace(/\{\{link_avaliacao\}\}/g, "https://avalie.me/" + atendimento.id.slice(0, 8));

          if (config.incluir_cupom && config.cupom_desconto) {
            mensagem += `\n\n🎫 Use o cupom ${config.cupom_desconto} no seu próximo atendimento!`;
          }

          // 7. Enviar via whatsapp-send
          const { error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
            body: {
              telefone: cliente.celular,
              mensagem,
              cliente_nome: cliente.nome,
            },
          });

          if (sendErr) {
            console.error(`[POS-ATENDIMENTO] Erro ao enviar para ${cliente.nome}:`, sendErr);
            continue;
          }

          // 8. Marcar como enviado
          await supabase
            .from("atendimentos")
            .update({ pos_atendimento_enviado: true })
            .eq("id", atendimento.id);

          totalProcessados++;
          console.log(`[POS-ATENDIMENTO] Enviado para ${cliente.nome} (${config.nome})`);
        } catch (innerErr) {
          console.error("[POS-ATENDIMENTO] Erro no atendimento:", innerErr);
        }
      }
    }

    console.log(`[POS-ATENDIMENTO] Total processados: ${totalProcessados}`);

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[POS-ATENDIMENTO] Erro geral:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
