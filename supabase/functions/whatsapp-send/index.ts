import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendMessageRequest {
  telefone: string;
  mensagem: string;
  cliente_nome?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get WhatsApp configuration
    const { data: config, error: configError } = await supabase
      .from("configuracoes_whatsapp")
      .select("*")
      .single();

    if (configError || !config) {
      console.error("Config error:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração do WhatsApp não encontrada",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!config.api_url || !config.api_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API do WhatsApp não configurada. Configure a URL e Token da API nas configurações.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { telefone, mensagem, cliente_nome }: SendMessageRequest = await req.json();

    if (!telefone || !mensagem) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telefone e mensagem são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format phone number (remove non-digits, add 55 if needed)
    let formattedPhone = telefone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    // Replace variables in message
    let finalMessage = mensagem;
    if (cliente_nome) {
      finalMessage = finalMessage.replace(/{nome}/g, cliente_nome);
    }

    // Send message via Evolution API (or compatible)
    const apiUrl = config.api_url.replace(/\/$/, "");
    const instanceName = config.numero_whatsapp || "default";

    console.log(`Sending message to ${formattedPhone} via ${apiUrl}`);

    // Evolution API v2 endpoint format
    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.api_token,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: finalMessage,
      }),
    });

    const responseText = await response.text();
    console.log("API Response:", response.status, responseText);

    if (!response.ok) {
      // Try alternative endpoint format (Evolution API v1)
      const altResponse = await fetch(`${apiUrl}/message/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.api_token}`,
        },
        body: JSON.stringify({
          id: instanceName,
          number: formattedPhone,
          message: finalMessage,
        }),
      });

      const altResponseText = await altResponse.text();
      console.log("Alt API Response:", altResponse.status, altResponseText);

      if (!altResponse.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erro ao enviar mensagem: ${response.status} - ${responseText}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Update credits if applicable
    const { data: creditos } = await supabase
      .from("comunicacao_creditos")
      .select("*")
      .single();

    if (creditos && creditos.saldo_creditos > 0) {
      await supabase
        .from("comunicacao_creditos")
        .update({ saldo_creditos: creditos.saldo_creditos - 1 })
        .eq("id", creditos.id);
    }

    // Update statistics
    const today = new Date().toISOString().split("T")[0];
    const { data: stats } = await supabase
      .from("comunicacao_estatisticas")
      .select("*")
      .eq("data", today)
      .single();

    if (stats) {
      await supabase
        .from("comunicacao_estatisticas")
        .update({ mensagens_enviadas: stats.mensagens_enviadas + 1 })
        .eq("id", stats.id);
    } else {
      await supabase.from("comunicacao_estatisticas").insert([
        {
          data: today,
          mensagens_enviadas: 1,
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mensagem enviada com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
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
