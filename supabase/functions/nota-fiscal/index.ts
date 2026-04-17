import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tipos
interface NotaFiscalRequest {
  acao: "emitir" | "cancelar" | "corrigir" | "inutilizar" | "consultar" | "status_sefaz" | "danfe";
  // Emissão
  tipo?: "nfe" | "nfce";
  nota_id?: string;
  cliente?: {
    nome?: string;
    cpf_cnpj?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  itens?: Array<{
    numero_item: number;
    codigo_produto: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    icms_origem?: string;
    icms_situacao_tributaria?: string;
    icms_aliquota?: number;
    icms_base_calculo?: number;
    icms_valor?: number;
  }>;
  pagamento?: {
    forma: string; // 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, 05=Crédito Loja, 15=Boleto, 99=Outros
    valor: number;
  };
  valor_total?: number;
  valor_desconto?: number;
  observacoes?: string;
  // Cancelamento
  motivo?: string;
  // CC-e
  texto_correcao?: string;
  // Inutilização
  modelo?: string;
  serie?: number;
  numero_inicial?: number;
  numero_final?: number;
  justificativa?: string;
}

// Helpers
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
  ambiente: string,
  tipoDoc = "nfce"
) {
  try {
    await supabase.from("fiscal_logs").insert({
      nota_fiscal_id: notaId,
      acao,
      tipo_documento: tipoDoc,
      codigo_retorno: codigoRetorno,
      mensagem_retorno: mensagemRetorno,
      xml_envio: xmlEnvio,
      xml_retorno: xmlRetorno,
      provider: "focus_nfe",
      ambiente,
    });
  } catch (e) {
    console.error("[FISCAL_LOG] Erro ao salvar log:", e);
  }
}

// Focus NFe API
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

  console.log(`[FOCUS_NFE] ${method} ${url}`);

  const options: RequestInit = { method, headers };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
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
        error: "Token da Focus NFe não configurado. Use: supabase secrets set FOCUS_NFE_TOKEN=seu_token",
      }, 500);
    }

    // Buscar configuração fiscal
    const { data: config } = await supabase
      .from("configuracoes_fiscal")
      .select("*")
      .maybeSingle();

    const ambiente = config?.ambiente || "2"; // Default: homologação

    const body: NotaFiscalRequest = await req.json();
    const { acao } = body;

    // ============================================================
    // AÇÃO: STATUS SEFAZ
    // ============================================================
    if (acao === "status_sefaz") {
      const uf = config?.endereco_uf || "MG";
      const resp = await focusFetch(focusToken, ambiente, "GET", `/v2/nfe/status_sefaz?uf=${uf}`);

      await gravarLog(supabase, null, "status_sefaz", resp.data?.status_sefaz || null, resp.data?.motivo || null, null, resp.raw, ambiente);

      return jsonResponse({
        success: resp.ok,
        online: resp.data?.status_sefaz === "107",
        status: resp.data?.status_sefaz,
        motivo: resp.data?.motivo,
      });
    }

    // ============================================================
    // AÇÃO: EMITIR NF-e / NFC-e
    // ============================================================
    if (acao === "emitir") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      // Buscar nota no banco
      const { data: nota, error: notaErr } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", body.nota_id)
        .single();

      if (notaErr || !nota) {
        return jsonResponse({ success: false, error: "Nota não encontrada" }, 404);
      }

      const tipoDoc = body.tipo || nota.tipo || "nfce";
      const endpoint = tipoDoc === "nfce" ? "/v2/nfce" : "/v2/nfe";
      const ref = `nota-${nota.id.substring(0, 8)}-${Date.now()}`;

      // Montar payload Focus NFe
      const payload: Record<string, unknown> = {
        natureza_operacao: "VENDA DE MERCADORIA",
        data_emissao: new Date().toISOString(),
        tipo_documento: "1", // Saída
        finalidade_emissao: "1", // Normal
        consumidor_final: "1",
        presenca_comprador: tipoDoc === "nfce" ? "1" : "0",
        // Emitente (puxado da config)
        cnpj_emitente: config?.cnpj?.replace(/\D/g, "") || "",
        nome_emitente: config?.empresa_razao_social || "",
        nome_fantasia_emitente: config?.empresa_nome_fantasia || "",
        inscricao_estadual_emitente: config?.inscricao_estadual?.replace(/\D/g, "") || "",
        logradouro_emitente: config?.endereco_logradouro || "",
        numero_emitente: config?.endereco_numero || "S/N",
        bairro_emitente: config?.endereco_bairro || "",
        municipio_emitente: config?.endereco_cidade || "",
        uf_emitente: config?.endereco_uf || "MG",
        cep_emitente: config?.endereco_cep?.replace(/\D/g, "") || "",
        regime_tributario: config?.regime_tributario || "1",
      };

      // Destinatário
      if (body.cliente?.cpf_cnpj) {
        const doc = body.cliente.cpf_cnpj.replace(/\D/g, "");
        if (doc.length === 11) {
          payload.cpf_destinatario = doc;
        } else if (doc.length === 14) {
          payload.cnpj_destinatario = doc;
        }
      }
      if (body.cliente?.nome) {
        payload.nome_destinatario = body.cliente.nome;
      }

      // Itens
      if (body.itens && body.itens.length > 0) {
        payload.itens = body.itens.map((item) => ({
          numero_item: item.numero_item,
          codigo_produto: item.codigo_produto,
          descricao: item.descricao,
          ncm: item.ncm || "00000000",
          cfop: item.cfop || "5102",
          unidade_comercial: item.unidade || "UN",
          quantidade_comercial: item.quantidade.toFixed(4),
          valor_unitario_comercial: item.valor_unitario.toFixed(10),
          valor_bruto: item.valor_total.toFixed(2),
          unidade_tributavel: item.unidade || "UN",
          quantidade_tributavel: item.quantidade.toFixed(4),
          valor_unitario_tributavel: item.valor_unitario.toFixed(10),
          origem: item.icms_origem || "0",
          icms_situacao_tributaria: item.icms_situacao_tributaria || "102",
          valor_desconto: "0.00",
          inclui_no_total: "1",
        }));
      }

      // Pagamento
      const formaPgto = body.pagamento?.forma || "01";
      const valorPgto = body.pagamento?.valor || nota.valor_total || 0;
      payload.formas_pagamento = [{
        forma_pagamento: formaPgto,
        valor_pagamento: valorPgto.toFixed(2),
      }];

      if (body.valor_total) {
        payload.valor_produtos = body.valor_total.toFixed(2);
        payload.valor_nota = body.valor_total.toFixed(2);
      }

      // Informações adicionais
      if (body.observacoes) {
        payload.informacoes_adicionais_contribuinte = body.observacoes;
      }

      // Enviar para Focus NFe
      const resp = await focusFetch(focusToken, ambiente, "POST", `${endpoint}?ref=${ref}`, payload);

      // Logar
      await gravarLog(
        supabase, nota.id, "emitir",
        resp.data?.status_sefaz || resp.data?.codigo || String(resp.status),
        resp.data?.mensagem_sefaz || resp.data?.mensagem || resp.raw?.substring(0, 500),
        JSON.stringify(payload).substring(0, 5000),
        resp.raw?.substring(0, 5000),
        ambiente
      );

      // Tratar resposta
      if (resp.ok && (resp.data?.status_sefaz === "100" || resp.data?.status === "autorizado")) {
        // Nota AUTORIZADA
        await supabase.from("notas_fiscais").update({
          status: "autorizada",
          chave_acesso: resp.data?.chave_nfe || resp.data?.chave || null,
          protocolo: resp.data?.numero_protocolo || resp.data?.protocolo || null,
          data_autorizacao: new Date().toISOString(),
          provider_ref: ref,
          tentativas_envio: (nota.tentativas_envio || 0) + 1,
          ultimo_envio: new Date().toISOString(),
        }).eq("id", nota.id);

        return jsonResponse({
          success: true,
          status: "autorizada",
          numero: nota.numero,
          chave_acesso: resp.data?.chave_nfe || resp.data?.chave,
          protocolo: resp.data?.numero_protocolo || resp.data?.protocolo,
          provider_ref: ref,
        });
      } else if (resp.data?.status === "processando_autorizacao") {
        // Ainda processando (NF-e assíncrona)
        await supabase.from("notas_fiscais").update({
          status: "processando",
          provider_ref: ref,
          tentativas_envio: (nota.tentativas_envio || 0) + 1,
          ultimo_envio: new Date().toISOString(),
        }).eq("id", nota.id);

        return jsonResponse({
          success: true,
          status: "processando",
          provider_ref: ref,
          mensagem: "Nota em processamento. Consulte em alguns segundos.",
        });
      } else {
        // REJEITADA
        const codigoRejeicao = resp.data?.status_sefaz || resp.data?.codigo || "ERRO";
        const mensagemRejeicao = resp.data?.mensagem_sefaz || resp.data?.mensagem || "Erro desconhecido";

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
    // AÇÃO: CONSULTAR
    // ============================================================
    if (acao === "consultar") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref, tipo")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "Nota sem referência do provider" }, 404);
      }

      const endpoint = nota.tipo === "nfce" ? "/v2/nfce" : "/v2/nfe";
      const resp = await focusFetch(focusToken, ambiente, "GET", `${endpoint}/${nota.provider_ref}`);

      await gravarLog(supabase, body.nota_id, "consultar", resp.data?.status_sefaz || null, resp.data?.mensagem_sefaz || null, null, resp.raw, ambiente);

      // Atualizar status se necessário
      if (resp.data?.status === "autorizado" || resp.data?.status_sefaz === "100") {
        await supabase.from("notas_fiscais").update({
          status: "autorizada",
          chave_acesso: resp.data?.chave_nfe || resp.data?.chave,
          protocolo: resp.data?.numero_protocolo || resp.data?.protocolo,
          data_autorizacao: resp.data?.data_autorizacao || new Date().toISOString(),
        }).eq("id", body.nota_id);
      }

      return jsonResponse({
        success: resp.ok,
        data: resp.data,
      });
    }

    // ============================================================
    // AÇÃO: CANCELAR
    // ============================================================
    if (acao === "cancelar") {
      if (!body.nota_id || !body.motivo) {
        return jsonResponse({ success: false, error: "nota_id e motivo são obrigatórios" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref, tipo")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "Nota sem referência do provider" }, 404);
      }

      const endpoint = nota.tipo === "nfce" ? "/v2/nfce" : "/v2/nfe";
      const resp = await focusFetch(focusToken, ambiente, "DELETE", `${endpoint}/${nota.provider_ref}`, {
        justificativa: body.motivo,
      });

      await gravarLog(supabase, body.nota_id, "cancelar", resp.data?.status_sefaz || null, resp.data?.mensagem_sefaz || null, JSON.stringify({ justificativa: body.motivo }), resp.raw, ambiente);

      if (resp.ok) {
        await supabase.from("notas_fiscais").update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
          motivo_rejeicao: body.motivo,
        }).eq("id", body.nota_id);

        return jsonResponse({ success: true, mensagem: "Nota cancelada com sucesso" });
      } else {
        return jsonResponse({
          success: false,
          codigo: resp.data?.status_sefaz,
          mensagem: resp.data?.mensagem_sefaz || resp.data?.mensagem || "Erro ao cancelar",
        });
      }
    }

    // ============================================================
    // AÇÃO: CARTA DE CORREÇÃO (CC-e)
    // ============================================================
    if (acao === "corrigir") {
      if (!body.nota_id || !body.texto_correcao) {
        return jsonResponse({ success: false, error: "nota_id e texto_correcao são obrigatórios" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref, tipo, seq_carta_correcao")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "Nota sem referência do provider" }, 404);
      }

      // Somente NF-e suporta CC-e
      const resp = await focusFetch(focusToken, ambiente, "POST", `/v2/nfe/${nota.provider_ref}/carta_correcao`, {
        correcao: body.texto_correcao,
      });

      const seqAtual = (nota.seq_carta_correcao || 0) + 1;

      await gravarLog(supabase, body.nota_id, "carta_correcao", resp.data?.status_sefaz || null, resp.data?.mensagem_sefaz || null, JSON.stringify({ correcao: body.texto_correcao }), resp.raw, ambiente);

      if (resp.ok) {
        await supabase.from("notas_fiscais").update({
          xml_carta_correcao: body.texto_correcao,
          seq_carta_correcao: seqAtual,
          motivo_rejeicao: `CCe ${seqAtual}: ${body.texto_correcao}`,
        }).eq("id", body.nota_id);

        // Registrar evento
        try {
          await supabase.from("notas_fiscais_eventos").insert({
            nota_fiscal_id: body.nota_id,
            tipo_evento: "110110",
            descricao: "Carta de Correção",
            sequencial: seqAtual,
            justificativa: body.texto_correcao,
            protocolo: resp.data?.numero_protocolo || null,
            status: "processado",
          });
        } catch (_) { /* tabela pode não existir ainda */ }

        return jsonResponse({ success: true, mensagem: "Carta de correção enviada com sucesso", sequencial: seqAtual });
      } else {
        return jsonResponse({
          success: false,
          codigo: resp.data?.status_sefaz,
          mensagem: resp.data?.mensagem_sefaz || "Erro ao enviar CC-e",
        });
      }
    }

    // ============================================================
    // AÇÃO: INUTILIZAR
    // ============================================================
    if (acao === "inutilizar") {
      if (!body.numero_inicial || !body.numero_final || !body.justificativa) {
        return jsonResponse({ success: false, error: "numero_inicial, numero_final e justificativa são obrigatórios" }, 400);
      }

      const cnpj = config?.cnpj?.replace(/\D/g, "") || "";
      const resp = await focusFetch(focusToken, ambiente, "POST", "/v2/nfe/inutilizacao", {
        cnpj: cnpj,
        serie: String(body.serie || 1),
        numero_inicial: String(body.numero_inicial),
        numero_final: String(body.numero_final),
        justificativa: body.justificativa,
        modelo: body.modelo || "65",
      });

      await gravarLog(supabase, null, "inutilizar", resp.data?.status_sefaz || null, resp.data?.mensagem_sefaz || null, JSON.stringify(body), resp.raw, ambiente);

      if (resp.ok) {
        // Registrar inutilização
        try {
          await supabase.from("notas_fiscais_inutilizadas").insert({
            modelo: body.modelo || "65",
            serie: body.serie || 1,
            numero_inicial: body.numero_inicial,
            numero_final: body.numero_final,
            justificativa: body.justificativa,
            status: "processado",
          });
        } catch (_) { /* tabela pode não existir */ }

        return jsonResponse({ success: true, mensagem: "Numeração inutilizada com sucesso" });
      } else {
        return jsonResponse({
          success: false,
          codigo: resp.data?.status_sefaz,
          mensagem: resp.data?.mensagem_sefaz || "Erro ao inutilizar",
        });
      }
    }

    // ============================================================
    // AÇÃO: DANFE (PDF)
    // ============================================================
    if (acao === "danfe") {
      if (!body.nota_id) {
        return jsonResponse({ success: false, error: "nota_id é obrigatório" }, 400);
      }

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("provider_ref, tipo")
        .eq("id", body.nota_id)
        .single();

      if (!nota?.provider_ref) {
        return jsonResponse({ success: false, error: "Nota sem referência do provider" }, 404);
      }

      const endpoint = nota.tipo === "nfce" ? "/v2/nfce" : "/v2/nfe";
      const baseUrl = ambiente === "1"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

      const pdfResp = await fetch(`${baseUrl}${endpoint}/${nota.provider_ref}/pdf`, {
        headers: {
          Authorization: "Basic " + btoa(focusToken + ":"),
        },
      });

      if (!pdfResp.ok) {
        return jsonResponse({ success: false, error: "Erro ao gerar DANFE" }, 500);
      }

      // Retornar URL do PDF
      const pdfData = await pdfResp.json();
      return jsonResponse({
        success: true,
        pdf_url: pdfData.url || pdfData.caminho_danfe,
      });
    }

    return jsonResponse({ success: false, error: `Ação desconhecida: ${acao}` }, 400);

  } catch (error) {
    console.error("[NOTA-FISCAL] Erro:", error);
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
