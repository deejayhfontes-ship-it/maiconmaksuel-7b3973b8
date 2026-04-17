import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gravarLog(
  supabase: ReturnType<typeof createClient>,
  notaId: string | null,
  acao: string,
  codigoRetorno: string | null,
  mensagemRetorno: string | null,
  xmlEnvio: string | null,
  xmlRetorno: string | null,
  ambiente: string
) {
  try {
    await supabase.from("fiscal_logs").insert({
      nota_fiscal_id: notaId,
      acao,
      tipo_documento: "nfse",
      codigo_retorno: codigoRetorno,
      mensagem_retorno: mensagemRetorno,
      xml_envio: xmlEnvio,
      xml_retorno: xmlRetorno,
      provider: "focus_nfe",
      ambiente,
    });
  } catch (e) {
    console.error("[FISCAL_LOG_NFSE] Erro:", e);
  }
}

async function focusFetch(
  token: string,
  ambiente: string,
  method: string,
  path: string,
  body?: unknown
) {
  const baseUrl = ambiente === "1"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";

  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: "Basic " + btoa(token + ":"),
  };

  console.log(`[FOCUS_NFSE] ${method} ${url}`);

  const options: RequestInit = { method, headers };
  if (body && (method === "POST" || method === "DELETE")) {
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: resp.status, ok: resp.ok, data: json, raw: text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const focusToken = Deno.env.get("FOCUS_NFE_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!focusToken) {
      return jsonResponse({
        success: false,
        error: "Token da Focus NFe não configurado.",
      }, 500);
    }

    const { data: config } = await supabase
      .from("configuracoes_fiscal")
      .select("*")
      .maybeSingle();

    const ambiente = config?.ambiente || "2";

    const body = await req.json();
    const { acao } = body;

    // ============================================================
    // AÇÃO: EMITIR NFS-e
    // ============================================================
    if (acao === "emitir") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      const { data: nota, error: notaErr } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", body.nota_id)
        .single();

      if (notaErr || !nota) {
        return jsonResponse({ success: false, error: "Nota não encontrada" }, 404);
      }

      const ref = `nfse-${nota.id.substring(0, 8)}-${Date.now()}`;

      // Payload NFS-e via Focus NFe
      const payload: Record<string, unknown> = {
        // Prestador
        cnpj_prestador: config?.cnpj?.replace(/\D/g, "") || "",
        inscricao_municipal_prestador: config?.inscricao_municipal?.replace(/\D/g, "") || "",
        // Tomador
        razao_social_tomador: body.tomador?.nome || nota.cliente_nome || "CONSUMIDOR",
        // RPS
        numero_rps: body.numero_rps || nota.numero_rps || nota.numero,
        serie_rps: body.serie_rps || String(config?.serie_nfse || "1"),
        tipo_rps: "1",
        data_emissao: new Date().toISOString(),
        natureza_operacao: "1", // Tributação no município
        regime_especial_tributacao: "6", // MEI padrão
        optante_simples_nacional: config?.regime_tributario === "1" ? "1" : "2",
        incentivador_cultural: "2",
        status: "1", // Normal
        // Serviço
        item_lista_servico: body.codigo_servico_lc116 || "0602",
        discriminacao: body.discriminacao || "Prestação de serviço de beleza e estética",
        valor_servicos: (body.valor_total || nota.valor_total || 0).toFixed(2),
        aliquota: (body.aliquota_iss || config?.aliquota_iss || 3).toFixed(2),
        codigo_municipio: config?.codigo_municipio_ibge || "",
      };

      // CPF/CNPJ do tomador
      if (body.tomador?.cpf_cnpj) {
        const doc = body.tomador.cpf_cnpj.replace(/\D/g, "");
        if (doc.length === 11) {
          payload.cpf_tomador = doc;
        } else if (doc.length === 14) {
          payload.cnpj_tomador = doc;
        }
      }

      // Email do tomador
      if (body.tomador?.email) {
        payload.email_tomador = body.tomador.email;
      }

      // Endereço do tomador
      if (body.tomador?.endereco) {
        payload.logradouro_tomador = body.tomador.endereco;
        payload.bairro_tomador = body.tomador.bairro || "";
        payload.cidade_tomador = body.tomador.cidade || config?.endereco_cidade || "";
        payload.uf_tomador = body.tomador.uf || config?.endereco_uf || "MG";
        payload.cep_tomador = body.tomador.cep?.replace(/\D/g, "") || "";
      }

      // Enviar para Focus NFe
      const resp = await focusFetch(focusToken, ambiente, "POST", `/v2/nfse?ref=${ref}`, payload);

      await gravarLog(
        supabase, nota.id, "emitir_nfse",
        resp.data?.codigo || String(resp.status),
        resp.data?.mensagem || resp.raw?.substring(0, 500),
        JSON.stringify(payload).substring(0, 5000),
        resp.raw?.substring(0, 5000),
        ambiente
      );

      if (resp.ok && (resp.data?.status === "autorizado" || resp.data?.status === "processando_autorizacao")) {
        const statusFinal = resp.data?.status === "autorizado" ? "autorizada" : "processando";

        await supabase.from("notas_fiscais").update({
          status: statusFinal,
          chave_acesso: resp.data?.numero_nfse || null,
          protocolo: resp.data?.codigo_verificacao || resp.data?.protocolo || null,
          data_autorizacao: statusFinal === "autorizada" ? new Date().toISOString() : null,
          provider_ref: ref,
          numero_rps: payload.numero_rps as number,
          tentativas_envio: (nota.tentativas_envio || 0) + 1,
          ultimo_envio: new Date().toISOString(),
        }).eq("id", nota.id);

        return jsonResponse({
          success: true,
          status: statusFinal,
          numero_nfse: resp.data?.numero_nfse,
          codigo_verificacao: resp.data?.codigo_verificacao,
          provider_ref: ref,
        });
      } else {
        const codigoRejeicao = resp.data?.codigo || "ERRO";
        const mensagemRejeicao = resp.data?.mensagem || "Erro desconhecido";

        await supabase.from("notas_fiscais").update({
          status: "rejeitada",
          codigo_rejeicao: String(codigoRejeicao).substring(0, 10),
          motivo_rejeicao: mensagemRejeicao.substring(0, 500),
          provider_ref: ref,
          tentativas_envio: (nota.tentativas_envio || 0) + 1,
          ultimo_envio: new Date().toISOString(),
        }).eq("id", nota.id);

        return jsonResponse({
          success: false,
          status: "rejeitada",
          codigo: codigoRejeicao,
          mensagem: mensagemRejeicao,
        });
      }
    }

    // ============================================================
    // AÇÃO: CANCELAR NFS-e
    // ============================================================
    if (acao === "cancelar") {
      if (!body.nota_id || !body.motivo) {
        return jsonResponse({ success: false, error: "nota_id e motivo são obrigatórios" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "NFS-e sem referência" }, 404);
      }

      const resp = await focusFetch(focusToken, ambiente, "DELETE", `/v2/nfse/${nota.provider_ref}`, {
        justificativa: body.motivo,
      });

      await gravarLog(supabase, body.nota_id, "cancelar_nfse", resp.data?.codigo || null, resp.data?.mensagem || null, JSON.stringify({ justificativa: body.motivo }), resp.raw, ambiente);

      if (resp.ok) {
        await supabase.from("notas_fiscais").update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
          motivo_rejeicao: body.motivo,
        }).eq("id", body.nota_id);

        return jsonResponse({ success: true, mensagem: "NFS-e cancelada com sucesso" });
      } else {
        return jsonResponse({
          success: false,
          codigo: resp.data?.codigo,
          mensagem: resp.data?.mensagem || "Erro ao cancelar NFS-e",
        });
      }
    }

    // ============================================================
    // AÇÃO: CONSULTAR NFS-e
    // ============================================================
    if (acao === "consultar") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "NFS-e sem referência" }, 404);
      }

      const resp = await focusFetch(focusToken, ambiente, "GET", `/v2/nfse/${nota.provider_ref}`);

      if (resp.data?.status === "autorizado") {
        await supabase.from("notas_fiscais").update({
          status: "autorizada",
          chave_acesso: resp.data?.numero_nfse,
          protocolo: resp.data?.codigo_verificacao,
          data_autorizacao: new Date().toISOString(),
        }).eq("id", body.nota_id);
      }

      return jsonResponse({ success: resp.ok, data: resp.data });
    }

    // ============================================================
    // AÇÃO: PDF NFS-e
    // ============================================================
    if (acao === "pdf") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "NFS-e sem referência" }, 404);
      }

      const baseUrl = ambiente === "1"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

      const pdfResp = await fetch(`${baseUrl}/v2/nfse/${nota.provider_ref}/pdf`, {
        headers: { Authorization: "Basic " + btoa(focusToken + ":") },
      });

      if (!pdfResp.ok) {
        return jsonResponse({ success: false, error: "Erro ao gerar PDF da NFS-e" }, 500);
      }

      const pdfData = await pdfResp.json();
      return jsonResponse({
        success: true,
        pdf_url: pdfData.url || pdfData.caminho_pdf,
      });
    }

    return jsonResponse({ success: false, error: `Ação NFS-e desconhecida: ${acao}` }, 400);

  } catch (error) {
    console.error("[EMITIR-NFSE] Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
