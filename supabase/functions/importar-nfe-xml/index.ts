import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.3.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface ImportRequest {
  xml: string;
  salao_id: string; // Opcional, se quisermos usar no payload em vez de token
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Auxiliares
const ensureArray = (obj: any) => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return [obj];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Pegar o token do request (se for necessário checar auth)
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const body: ImportRequest = await req.json();
    
    if (!body.xml) {
      return jsonResponse({ success: false, error: "XML não fornecido" }, 400);
    }

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "_",
    });
    
    let jsonObj;
    try {
      jsonObj = parser.parse(body.xml);
    } catch (e) {
      return jsonResponse({ success: false, error: "XML malformado ou inválido" }, 400);
    }

    // Validar se é uma NFe válida
    const nfeProc = jsonObj.nfeProc;
    if (!nfeProc || !nfeProc.NFe || !nfeProc.NFe.infNFe) {
      // Pode ser apenas <NFe>
      if (jsonObj.NFe && jsonObj.NFe.infNFe) {
        jsonObj.nfeProc = { NFe: jsonObj.NFe }; // Normaliza
      } else {
        return jsonResponse({ success: false, error: "Estrutura XML não reconhecida como NF-e" }, 400);
      }
    }

    const infNFe = jsonObj.nfeProc.NFe.infNFe;
    const protNFe = jsonObj.nfeProc.protNFe;

    // 1. Chave de acesso
    let chaveAcesso = "";
    if (infNFe._Id && infNFe._Id.startsWith("NFe")) {
      chaveAcesso = infNFe._Id.replace("NFe", "");
    } else if (protNFe?.infProt?.chNFe) {
      chaveAcesso = protNFe.infProt.chNFe;
    }

    if (!chaveAcesso || chaveAcesso.length !== 44) {
      return jsonResponse({ success: false, error: "Chave de acesso não encontrada no XML" }, 400);
    }

    // Checar duplicidade (via Supabase). Necessita que a tabela notas_fiscais_entrada exista
    // Usaremos select com limit 1
    if (body.salao_id) {
       const { data: notaExistente } = await supabase
         .from("notas_fiscais_entrada")
         .select("id")
         .eq("chave_acesso", chaveAcesso)
         .eq("salao_id", body.salao_id)
         .maybeSingle();

       if (notaExistente) {
         return jsonResponse({ 
           success: false, 
           error: "Esta nota fiscal já foi importada no sistema.",
           codigo_erro: "NOTA_DUPLICADA"
         }, 400);
       }
    }

    // 2. Emitente (Fornecedor)
    const emit = infNFe.emit;
    const fornecedor = {
      tipo_pessoa: emit.CNPJ ? "PJ" : "PF",
      documento: emit.CNPJ || emit.CPF || "",
      razao_social: emit.xNome || "",
      nome_fantasia: emit.xFant || emit.xNome || "",
      inscricao_estadual: emit.IE || "",
      endereco_logradouro: emit.enderEmit?.xLgr || "",
      endereco_numero: emit.enderEmit?.nro || "",
      endereco_bairro: emit.enderEmit?.xBairro || "",
      endereco_municipio: emit.enderEmit?.xMun || "",
      endereco_uf: emit.enderEmit?.UF || "",
      endereco_cep: emit.enderEmit?.CEP || "",
    };

    // Validar destinatário (Opcional por enquanto, mas importante: CNPJ do Destinatario == CNPJ Salão)
    const dest = infNFe.dest;
    const destinatario_documento = dest?.CNPJ || dest?.CPF || "";

    // 3. Dados da Nota
    const ide = infNFe.ide;
    const total = infNFe.total?.ICMSTot || {};
    
    const nota = {
      chave_acesso: chaveAcesso,
      numero: ide.nNF,
      serie: ide.serie,
      modelo: ide.mod,
      natureza_operacao: ide.natOp,
      data_emissao: ide.dhEmi,
      valor_produtos: Number(total.vProd || 0),
      valor_desconto: Number(total.vDesc || 0),
      valor_frete: Number(total.vFrete || 0),
      valor_outros: Number(total.vOutro || 0),
      valor_total: Number(total.vNF || 0),
      protocolo: protNFe?.infProt?.nProt || "",
      dados_brutos: jsonObj // Guardamos o json completo para auditoria
    };

    // 4. Itens (Produtos)
    const detArray = ensureArray(infNFe.det);
    const itens = detArray.map((det: any) => {
      const prod = det.prod;
      return {
        numero_item: Number(det._nItem || 1),
        codigo_fornecedor: String(prod.cProd || ""),
        ean: String(prod.cEAN !== "SEM GTIN" ? prod.cEAN : ""),
        descricao: String(prod.xProd || ""),
        ncm: String(prod.NCM || ""),
        cfop: String(prod.CFOP || ""),
        unidade_comercial: String(prod.uCom || ""),
        quantidade_comercial: Number(prod.qCom || 0),
        valor_unitario_comercial: Number(prod.vUnCom || 0),
        valor_total_item: Number(prod.vProd || 0),
        desconto_item: Number(prod.vDesc || 0),
        // Custo entrada provisório (pode incluir rateio de frete futuramente)
        custo_unitario_calculado: Number(prod.vUnCom || 0), 
        fator_conversao: 1, // Default, usuário pode alterar no frontend
      };
    });

    // 5. Duplicatas (Contas a Pagar)
    let duplicatas: any[] = [];
    if (infNFe.cobr && infNFe.cobr.dup) {
      const dupArray = ensureArray(infNFe.cobr.dup);
      duplicatas = dupArray.map((dup: any) => ({
        numero_dup: String(dup.nDup || ""),
        vencimento: String(dup.dVenc || ""),
        valor: Number(dup.vDup || 0),
      }));
    } else {
      // À vista - Gera parcela única para o dia da emissão
      duplicatas.push({
        numero_dup: "001",
        vencimento: ide.dhEmi ? String(ide.dhEmi).substring(0, 10) : new Date().toISOString().substring(0, 10),
        valor: nota.valor_total
      });
    }

    return jsonResponse({
      success: true,
      destinatario_documento,
      fornecedor,
      nota,
      itens,
      duplicatas
    });

  } catch (error) {
    console.error("[IMPORTAR-NFE-XML] Erro:", error);
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
