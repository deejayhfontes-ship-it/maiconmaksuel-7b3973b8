import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook de retorno fiscal — recebe callbacks assíncronos do provider (Focus NFe)
 * 
 * Quando a SEFAZ responde de forma assíncrona (NF-e processando_autorizacao),
 * o provider envia o resultado para este endpoint.
 * 
 * URL a configurar no painel Focus NFe:
 *   https://<PROJECT_ID>.supabase.co/functions/v1/webhook-retorno-fiscal
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    console.log("[WEBHOOK_FISCAL] Recebido:", JSON.stringify(body).substring(0, 1000));

    // Focus NFe envia o campo "ref" que setamos na emissão
    const ref = body.ref || body.referencia;
    const evento = body.evento || body.status;

    if (!ref) {
      console.warn("[WEBHOOK_FISCAL] Webhook sem referência (ref)");
      return new Response(JSON.stringify({ ok: true, msg: "sem ref" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar nota pela referência do provider
    const { data: nota, error: notaErr } = await supabase
      .from("notas_fiscais")
      .select("id, status, tentativas_envio")
      .eq("provider_ref", ref)
      .maybeSingle();

    if (notaErr || !nota) {
      console.warn("[WEBHOOK_FISCAL] Nota não encontrada para ref:", ref);
      return new Response(JSON.stringify({ ok: true, msg: "nota não encontrada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logar webhook
    try {
      await supabase.from("fiscal_logs").insert({
        nota_fiscal_id: nota.id,
        acao: `webhook_${evento || "callback"}`,
        tipo_documento: ref.startsWith("nfse") ? "nfse" : "nfce",
        codigo_retorno: body.status_sefaz || body.codigo || null,
        mensagem_retorno: body.mensagem_sefaz || body.mensagem || null,
        xml_retorno: JSON.stringify(body).substring(0, 5000),
        provider: "focus_nfe",
        ambiente: body.ambiente || "2",
      });
    } catch (_) { /* ignora erro de log */ }

    // Processar evento
    if (evento === "autorizado" || body.status_sefaz === "100") {
      // NOTA AUTORIZADA
      await supabase.from("notas_fiscais").update({
        status: "autorizada",
        chave_acesso: body.chave_nfe || body.chave || body.numero_nfse || null,
        protocolo: body.numero_protocolo || body.protocolo || body.codigo_verificacao || null,
        data_autorizacao: body.data_autorizacao || new Date().toISOString(),
        xml_retorno: body.xml || body.caminho_xml_nota_fiscal || null,
      }).eq("id", nota.id);

      console.log(`[WEBHOOK_FISCAL] Nota ${nota.id} AUTORIZADA`);
    } else if (evento === "erro_autorizacao" || evento === "rejeitado") {
      // NOTA REJEITADA
      await supabase.from("notas_fiscais").update({
        status: "rejeitada",
        codigo_rejeicao: String(body.status_sefaz || body.codigo || "ERRO").substring(0, 10),
        motivo_rejeicao: (body.mensagem_sefaz || body.mensagem || "Erro desconhecido").substring(0, 500),
      }).eq("id", nota.id);

      console.log(`[WEBHOOK_FISCAL] Nota ${nota.id} REJEITADA: ${body.mensagem_sefaz || body.mensagem}`);
    } else if (evento === "cancelado") {
      // NOTA CANCELADA
      await supabase.from("notas_fiscais").update({
        status: "cancelada",
        data_cancelamento: new Date().toISOString(),
      }).eq("id", nota.id);

      console.log(`[WEBHOOK_FISCAL] Nota ${nota.id} CANCELADA via webhook`);
    } else {
      console.log(`[WEBHOOK_FISCAL] Evento não tratado: ${evento}`);
    }

    // Responder 200 para o provider confirmar recebimento
    return new Response(
      JSON.stringify({ ok: true, nota_id: nota.id, evento }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[WEBHOOK_FISCAL] Erro:", error);
    // Mesmo com erro, retornar 200 para evitar retentativas infinitas
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
