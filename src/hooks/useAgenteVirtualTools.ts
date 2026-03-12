/**
 * useAgenteVirtualTools
 * Ferramentas do Agente Virtual Max para Function Calling com Gemini.
 * Cada ferramenta: declaração (para enviar ao Gemini) + execução (real no Supabase/Z-API)
 */
import { supabase } from "@/integrations/supabase/client";

// ── Tipo retorno de ferramenta ──
export type ToolResult = { sucesso: boolean; dados?: unknown; mensagem: string };

// ── Configurações Z-API (buscadas do Supabase) ──
async function getZapiConfig(): Promise<{ url: string; token: string } | null> {
    const { data } = await supabase
        .from("configuracoes_whatsapp")
        .select("valor")
        .in("chave", ["zapi_instance_id", "zapi_token", "zapi_client_token"])
        .limit(10);

    if (!data) return null;
    const cfg: Record<string, string> = {};
    data.forEach((row: { valor: string; chave?: string }) => {
        const asAny = row as Record<string, string>;
        if (asAny.chave) cfg[asAny.chave] = row.valor;
    });

    // Busca alternativa se tabela for diferente
    const instanceId = cfg["zapi_instance_id"];
    const clientToken = cfg["zapi_client_token"];
    const token = cfg["zapi_token"];

    if (!instanceId || !token) return null;
    return {
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
        token: clientToken || token,
    };
}

// ══════════════════════════════════════════════════════════
// DECLARAÇÕES DE FERRAMENTAS — enviadas ao Gemini
// ══════════════════════════════════════════════════════════
export const TOOL_DECLARATIONS = [
    {
        name: "buscar_clientes",
        description: "Busca clientes cadastrados no sistema pelo nome ou lista todos. Use para descobrir o ID do cliente antes de agendar ou enviar mensagens.",
        parameters: {
            type: "object",
            properties: {
                nome: { type: "string", description: "Nome parcial do cliente para buscar (opcional)" },
                limite: { type: "number", description: "Quantidade máxima de resultados (padrão 10)" }
            }
        }
    },
    {
        name: "buscar_clientes_inativos",
        description: "Lista clientes que não visitam o salão há X dias. Útil para recuperação de clientes perdidos.",
        parameters: {
            type: "object",
            properties: {
                dias: { type: "number", description: "Número de dias sem visita (padrão 30)" }
            }
        }
    },
    {
        name: "buscar_agendamentos",
        description: "Busca agendamentos por data, cliente ou status.",
        parameters: {
            type: "object",
            properties: {
                data: { type: "string", description: "Data no formato YYYY-MM-DD (opcional)" },
                cliente_nome: { type: "string", description: "Nome do cliente (opcional)" },
                status: { type: "string", description: "Status: agendado, confirmado, concluido, cancelado (opcional)" }
            }
        }
    },
    {
        name: "buscar_profissionais",
        description: "Lista os profissionais/colaboradores do salão com seus dados.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "buscar_servicos",
        description: "Lista os serviços disponíveis no salão.",
        parameters: {
            type: "object",
            properties: {
                categoria: { type: "string", description: "Filtrar por categoria (opcional)" }
            }
        }
    },
    {
        name: "criar_agendamento",
        description: "Cria um novo agendamento para um cliente. Primeiro use buscar_clientes para obter o ID do cliente e buscar_servicos para o ID do serviço.",
        parameters: {
            type: "object",
            properties: {
                cliente_id: { type: "string", description: "ID do cliente (obtenha com buscar_clientes)" },
                servico_id: { type: "string", description: "ID do serviço (obtenha com buscar_servicos)" },
                profissional_id: { type: "string", description: "ID do profissional (obtenha com buscar_profissionais)" },
                data_hora: { type: "string", description: "Data e hora no formato ISO: YYYY-MM-DDTHH:MM:00" },
                observacoes: { type: "string", description: "Observações opcionais" }
            },
            required: ["cliente_id", "servico_id", "profissional_id", "data_hora"]
        }
    },
    {
        name: "cancelar_agendamento",
        description: "Cancela um agendamento existente. Use buscar_agendamentos para obter o ID.",
        parameters: {
            type: "object",
            properties: {
                agendamento_id: { type: "string", description: "ID do agendamento a cancelar" },
                motivo: { type: "string", description: "Motivo do cancelamento (opcional)" }
            },
            required: ["agendamento_id"]
        }
    },
    {
        name: "enviar_whatsapp",
        description: "Envia uma mensagem WhatsApp para um cliente. Use buscar_clientes para obter o celular.",
        parameters: {
            type: "object",
            properties: {
                celular: { type: "string", description: "Celular do cliente no formato 5511999999999 (com DDI 55)" },
                mensagem: { type: "string", description: "Texto da mensagem a enviar" },
                nome_cliente: { type: "string", description: "Nome do cliente para confirmação" }
            },
            required: ["celular", "mensagem"]
        }
    },
    {
        name: "criar_lembrete",
        description: "Salva um lembrete ou item de lista de compras no sistema.",
        parameters: {
            type: "object",
            properties: {
                texto: { type: "string", description: "Texto do lembrete" },
                tipo: { type: "string", description: "Tipo: lembrete ou compras (padrão: lembrete)" }
            },
            required: ["texto"]
        }
    },
    {
        name: "ver_resumo_dia",
        description: "Mostra o resumo do dia atual: agendamentos, clientes aguardando, faturamento.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "ver_estoque_produtos",
        description: "Mostra o estoque atual de produtos. Pode filtrar por produtos com estoque baixo (abaixo do mínimo) ou listar todos. Útil para saber o que precisa ser reposto.",
        parameters: {
            type: "object",
            properties: {
                apenas_baixo: { type: "boolean", description: "Se true, mostra apenas produtos com estoque abaixo do mínimo" },
                categoria: { type: "string", description: "Filtrar por categoria (opcional)" }
            }
        }
    },
    {
        name: "clientes_que_precisam_atencao",
        description: "Lista clientes que precisam de atenção: estão com contas em aberto/vencidas, ou sem visitar há muito tempo. Use para priorizar ações de cobrança ou recuperação.",
        parameters: {
            type: "object",
            properties: {
                dias_sem_visita: { type: "number", description: "Dias sem visita para considerar inativo (padrão 45)" },
                incluir_inadimplentes: { type: "boolean", description: "Incluir clientes com contas vencidas (padrão true)" }
            }
        }
    },
    {
        name: "maiores_devedores",
        description: "Lista os clientes com maior valor em aberto em contas a receber. Mostra o ranking de quem deve mais ao salão.",
        parameters: {
            type: "object",
            properties: {
                limite: { type: "number", description: "Quantidade de devedores a listar (padrão 10)" },
                apenas_vencidos: { type: "boolean", description: "Se true, mostra apenas contas vencidas (padrão false = todas em aberto)" }
            }
        }
    }
];

// ══════════════════════════════════════════════════════════
// EXECUÇÕES REAIS DAS FERRAMENTAS
// ══════════════════════════════════════════════════════════

async function buscarClientes(args: { nome?: string; limite?: number }): Promise<ToolResult> {
    let query = supabase
        .from("clientes")
        .select("id, nome, celular, email, ultima_visita, total_visitas, ativo")
        .eq("ativo", true)
        .order("nome")
        .limit(args.limite || 10);

    if (args.nome) {
        query = query.ilike("nome", `%${args.nome}%`);
    }

    const { data, error } = await query;
    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    if (!data?.length) return { sucesso: true, mensagem: "Nenhum cliente encontrado.", dados: [] };

    return {
        sucesso: true,
        mensagem: `${data.length} cliente(s) encontrado(s).`,
        dados: data
    };
}

async function buscarClientesInativos(args: { dias?: number }): Promise<ToolResult> {
    const dias = args.dias || 30;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, celular, ultima_visita, total_visitas")
        .eq("ativo", true)
        .or(`ultima_visita.lt.${dataLimite.toISOString()},ultima_visita.is.null`)
        .order("ultima_visita", { ascending: true })
        .limit(20);

    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    if (!data?.length) return { sucesso: true, mensagem: `Nenhum cliente inativo há mais de ${dias} dias.`, dados: [] };

    return {
        sucesso: true,
        mensagem: `${data.length} cliente(s) sem visita há mais de ${dias} dias.`,
        dados: data.map(c => ({
            ...c,
            dias_sem_visita: c.ultima_visita
                ? Math.floor((Date.now() - new Date(c.ultima_visita).getTime()) / 86400000)
                : "nunca visitou"
        }))
    };
}

async function buscarAgendamentos(args: { data?: string; cliente_nome?: string; status?: string }): Promise<ToolResult> {
    let query = supabase
        .from("agendamentos")
        .select(`
            id, data_hora, status, observacoes,
            cliente:clientes(id, nome, celular),
            profissional:profissionais(id, nome),
            servico:servicos(id, nome, duracao_minutos, preco)
        `)
        .order("data_hora", { ascending: true })
        .limit(15);

    if (args.data) {
        const inicio = `${args.data}T00:00:00`;
        const fim = `${args.data}T23:59:59`;
        query = query.gte("data_hora", inicio).lte("data_hora", fim);
    }
    if (args.status) {
        query = query.eq("status", args.status);
    }

    const { data, error } = await query;
    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };

    let result = data || [];

    // Filtro de nome do cliente no lado JS (não é possível filtrar nested com ilike direto)
    if (args.cliente_nome) {
        const nomeB = args.cliente_nome.toLowerCase();
        result = result.filter((a) => {
            const c = a.cliente as { nome?: string } | null;
            return c?.nome?.toLowerCase().includes(nomeB);
        });
    }

    if (!result.length) return { sucesso: true, mensagem: "Nenhum agendamento encontrado.", dados: [] };

    return {
        sucesso: true,
        mensagem: `${result.length} agendamento(s) encontrado(s).`,
        dados: result.map(a => {
            const cli = a.cliente as { nome?: string; celular?: string } | null;
            const pro = a.profissional as { nome?: string } | null;
            const srv = a.servico as { nome?: string; preco?: number } | null;
            return {
                id: a.id,
                data_hora: a.data_hora,
                status: a.status,
                cliente: cli?.nome,
                cliente_celular: cli?.celular,
                profissional: pro?.nome,
                servico: srv?.nome,
                preco: srv?.preco,
                observacoes: a.observacoes,
            };
        })
    };
}

async function buscarProfissionais(): Promise<ToolResult> {
    const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade, ativo")
        .eq("ativo", true)
        .order("nome");

    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    return { sucesso: true, mensagem: `${data?.length || 0} profissional(is) encontrado(s).`, dados: data };
}

async function buscarServicos(args: { categoria?: string }): Promise<ToolResult> {
    let query = supabase
        .from("servicos")
        .select("id, nome, categoria, preco, duracao_minutos, ativo")
        .eq("ativo", true)
        .order("nome")
        .limit(30);

    if (args.categoria) {
        query = query.ilike("categoria", `%${args.categoria}%`);
    }

    const { data, error } = await query;
    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    return { sucesso: true, mensagem: `${data?.length || 0} serviço(s) encontrado(s).`, dados: data };
}

async function criarAgendamento(args: {
    cliente_id: string;
    servico_id: string;
    profissional_id: string;
    data_hora: string;
    observacoes?: string;
}): Promise<ToolResult> {
    // Verifica conflito de horário
    const srv = await supabase.from("servicos").select("duracao_minutos, nome, preco").eq("id", args.servico_id).single();
    const duracao = srv.data?.duracao_minutos || 60;

    const dataFim = new Date(args.data_hora);
    dataFim.setMinutes(dataFim.getMinutes() + duracao);

    const { data: conflito } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("profissional_id", args.profissional_id)
        .in("status", ["agendado", "confirmado"])
        .gte("data_hora", args.data_hora)
        .lt("data_hora", dataFim.toISOString())
        .limit(1);

    if (conflito && conflito.length > 0) {
        return {
            sucesso: false,
            mensagem: `⚠️ Horário conflitante! O profissional já tem agendamento nesse período.`
        };
    }

    const { data, error } = await supabase
        .from("agendamentos")
        .insert({
            cliente_id: args.cliente_id,
            servico_id: args.servico_id,
            profissional_id: args.profissional_id,
            data_hora: args.data_hora,
            duracao_minutos: duracao,
            status: "agendado",
            observacoes: args.observacoes || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select()
        .single();

    if (error) return { sucesso: false, mensagem: `Erro ao criar agendamento: ${error.message}` };

    return {
        sucesso: true,
        mensagem: `✅ Agendamento criado com sucesso! ID: ${data.id}`,
        dados: data
    };
}

async function cancelarAgendamento(args: { agendamento_id: string; motivo?: string }): Promise<ToolResult> {
    const { data: ag } = await supabase
        .from("agendamentos")
        .select("status, data_hora, cliente:clientes(nome)")
        .eq("id", args.agendamento_id)
        .single();

    if (!ag) return { sucesso: false, mensagem: "Agendamento não encontrado." };
    const cli = ag.cliente as { nome?: string } | null;
    if (ag.status === "cancelado") return { sucesso: false, mensagem: "Este agendamento já está cancelado." };

    const { error } = await supabase
        .from("agendamentos")
        .update({
            status: "cancelado",
            observacoes: args.motivo ? `Cancelado: ${args.motivo}` : "Cancelado pelo agente virtual"
        })
        .eq("id", args.agendamento_id);

    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };

    return {
        sucesso: true,
        mensagem: `✅ Agendamento de ${cli?.nome || "cliente"} em ${new Date(ag.data_hora).toLocaleString("pt-BR")} cancelado com sucesso.`
    };
}

async function enviarWhatsApp(args: { celular: string; mensagem: string; nome_cliente?: string }): Promise<ToolResult> {
    const config = await getZapiConfig();
    if (!config) {
        return { sucesso: false, mensagem: "Z-API não configurada. Configure em Configurações → WhatsApp." };
    }

    // Normaliza celular: remove tudo que não é número, garante DDI 55
    let phone = args.celular.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;

    try {
        const res = await fetch(`${config.url}/send-text`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Client-Token": config.token,
            },
            body: JSON.stringify({ phone, message: args.mensagem }),
        });

        if (!res.ok) {
            const errText = await res.text();
            return { sucesso: false, mensagem: `Erro Z-API (${res.status}): ${errText}` };
        }

        return {
            sucesso: true,
            mensagem: `✅ WhatsApp enviado para ${args.nome_cliente || phone}!`
        };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        return { sucesso: false, mensagem: `Erro ao enviar: ${msg}` };
    }
}

async function criarLembrete(args: { texto: string; tipo?: string }): Promise<ToolResult> {
    const tipo = args.tipo || "lembrete";
    const key = tipo === "compras" ? "lista_compras_max" : "lembretes_max";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const novo = {
        id: Date.now(),
        texto: args.texto,
        criado: new Date().toLocaleString("pt-BR"),
        feito: false
    };
    localStorage.setItem(key, JSON.stringify([...existing, novo]));
    return {
        sucesso: true,
        mensagem: `✅ ${tipo === "compras" ? "Item adicionado à lista de compras" : "Lembrete criado"}: "${args.texto}"`
    };
}

async function verResumoDia(): Promise<ToolResult> {
    const hoje = new Date().toISOString().split("T")[0];
    const inicio = `${hoje}T00:00:00`;
    const fim = `${hoje}T23:59:59`;

    const [agendados, confirmados, concluidos] = await Promise.all([
        supabase.from("agendamentos").select("id", { count: "exact" }).eq("status", "agendado").gte("data_hora", inicio).lte("data_hora", fim),
        supabase.from("agendamentos").select("id", { count: "exact" }).eq("status", "confirmado").gte("data_hora", inicio).lte("data_hora", fim),
        supabase.from("agendamentos").select("id, servico:servicos(preco)", { count: "exact" }).eq("status", "concluido").gte("data_hora", inicio).lte("data_hora", fim),
    ]);

    const faturamento = (concluidos.data || []).reduce((acc: number, a) => {
        const srv = a.servico as { preco?: number } | null;
        return acc + (srv?.preco || 0);
    }, 0);

    return {
        sucesso: true,
        mensagem: `Resumo do dia ${new Date().toLocaleDateString("pt-BR")} carregado.`,
        dados: {
            agendados: agendados.count || 0,
            confirmados: confirmados.count || 0,
            concluidos: concluidos.count || 0,
            faturamento_dia: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(faturamento)
        }
    };
}

async function verEstoqueProdutos(args: { apenas_baixo?: boolean; categoria?: string }): Promise<ToolResult> {
    let query = supabase
        .from("produtos")
        .select("id, nome, categoria, estoque_atual, estoque_minimo, preco_venda, ativo")
        .eq("ativo", true)
        .order("nome")
        .limit(50);

    if (args.categoria) {
        query = query.ilike("categoria", `%${args.categoria}%`);
    }

    const { data, error } = await query;
    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    if (!data?.length) return { sucesso: true, mensagem: "Nenhum produto cadastrado.", dados: [] };

    const produtos = data.map(p => ({
        ...p,
        status_estoque: (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0) ? "⚠️ ESTOQUE BAIXO" : "✅ OK",
        preco_venda_fmt: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.preco_venda ?? 0)
    }));

    const resultado = args.apenas_baixo
        ? produtos.filter(p => (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0))
        : produtos;

    const baixo = produtos.filter(p => (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0)).length;

    return {
        sucesso: true,
        mensagem: `${resultado.length} produto(s) listado(s). ${baixo} com estoque baixo.`,
        dados: resultado
    };
}

async function clientesQuePrecisamAtencao(args: { dias_sem_visita?: number; incluir_inadimplentes?: boolean }): Promise<ToolResult> {
    const dias = args.dias_sem_visita ?? 45;
    const incluirInad = args.incluir_inadimplentes !== false;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    const hoje = new Date().toISOString().split("T")[0];

    const resultados: Record<string, unknown>[] = [];

    // Clientes inativos (sem visita)
    const { data: inativos } = await supabase
        .from("clientes")
        .select("id, nome, celular, ultima_visita")
        .eq("ativo", true)
        .or(`ultima_visita.lt.${dataLimite.toISOString()},ultima_visita.is.null`)
        .order("ultima_visita", { ascending: true })
        .limit(15);

    (inativos || []).forEach(c => {
        resultados.push({
            nome: c.nome,
            celular: c.celular,
            motivo: `Sem visitar há ${c.ultima_visita ? Math.floor((Date.now() - new Date(c.ultima_visita).getTime()) / 86400000) : "mais de 90"} dias`,
            prioridade: "🟡 INATIVO"
        });
    });

    // Inadimplentes
    if (incluirInad) {
        const { data: contas } = await supabase
            .from("contas_receber")
            .select("valor, data_vencimento, cliente:clientes(id, nome, celular)")
            .eq("status", "pendente")
            .lt("data_vencimento", hoje)
            .order("data_vencimento", { ascending: true })
            .limit(15);

        (contas || []).forEach(c => {
            const cli = c.cliente as { nome?: string; celular?: string } | null;
            if (cli?.nome) {
                resultados.push({
                    nome: cli.nome,
                    celular: cli.celular,
                    motivo: `Conta vencida em ${new Date(c.data_vencimento).toLocaleDateString("pt-BR")} — R$ ${Number(c.valor).toFixed(2)}`,
                    prioridade: "🔴 INADIMPLENTE"
                });
            }
        });
    }

    if (!resultados.length) return { sucesso: true, mensagem: "Nenhum cliente precisando de atenção no momento! 🎉", dados: [] };

    return {
        sucesso: true,
        mensagem: `${resultados.length} cliente(s) precisam de atenção.`,
        dados: resultados
    };
}

async function maioresDevedores(args: { limite?: number; apenas_vencidos?: boolean }): Promise<ToolResult> {
    const limite = args.limite ?? 10;
    const hoje = new Date().toISOString().split("T")[0];

    let query = supabase
        .from("contas_receber")
        .select("cliente_id, valor, data_vencimento, cliente:clientes(nome, celular)")
        .eq("status", "pendente");

    if (args.apenas_vencidos) {
        query = query.lt("data_vencimento", hoje);
    }

    const { data, error } = await query;
    if (error) return { sucesso: false, mensagem: `Erro: ${error.message}` };
    if (!data?.length) return { sucesso: true, mensagem: "Nenhuma conta a receber em aberto.", dados: [] };

    // Agrupa por cliente e soma dívidas
    const porCliente = new Map<string, { nome: string; celular: string; total: number; qtd_contas: number }>();
    data.forEach(c => {
        const cli = c.cliente as { nome?: string; celular?: string } | null;
        const nome = cli?.nome || "Desconhecido";
        const celular = cli?.celular || "";
        const chave = c.cliente_id || nome;
        const atual = porCliente.get(chave) || { nome, celular, total: 0, qtd_contas: 0 };
        atual.total += Number(c.valor) || 0;
        atual.qtd_contas += 1;
        porCliente.set(chave, atual);
    });

    const ranking = Array.from(porCliente.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limite)
        .map((d, i) => ({
            posicao: `${i + 1}º`,
            nome: d.nome,
            celular: d.celular,
            total_devido: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.total),
            qtd_contas: d.qtd_contas
        }));

    const totalGeral = Array.from(porCliente.values()).reduce((s, d) => s + d.total, 0);

    return {
        sucesso: true,
        mensagem: `Top ${ranking.length} devedores. Total em aberto: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalGeral)}.`,
        dados: ranking
    };
}

// ══════════════════════════════════════════════════════════
// DISPATCHER — executa a ferramenta pelo nome
// ══════════════════════════════════════════════════════════
export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
        switch (name) {
            case "buscar_clientes": return await buscarClientes(args as { nome?: string; limite?: number });
            case "buscar_clientes_inativos": return await buscarClientesInativos(args as { dias?: number });
            case "buscar_agendamentos": return await buscarAgendamentos(args as { data?: string; cliente_nome?: string; status?: string });
            case "buscar_profissionais": return await buscarProfissionais();
            case "buscar_servicos": return await buscarServicos(args as { categoria?: string });
            case "criar_agendamento": return await criarAgendamento(args as { cliente_id: string; servico_id: string; profissional_id: string; data_hora: string; observacoes?: string });
            case "cancelar_agendamento": return await cancelarAgendamento(args as { agendamento_id: string; motivo?: string });
            case "enviar_whatsapp": return await enviarWhatsApp(args as { celular: string; mensagem: string; nome_cliente?: string });
            case "criar_lembrete": return await criarLembrete(args as { texto: string; tipo?: string });
            case "ver_resumo_dia": return await verResumoDia();
            case "ver_estoque_produtos": return await verEstoqueProdutos(args as { apenas_baixo?: boolean; categoria?: string });
            case "clientes_que_precisam_atencao": return await clientesQuePrecisamAtencao(args as { dias_sem_visita?: number; incluir_inadimplentes?: boolean });
            case "maiores_devedores": return await maioresDevedores(args as { limite?: number; apenas_vencidos?: boolean });
            default: return { sucesso: false, mensagem: `Ferramenta desconhecida: ${name}` };
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro inesperado";
        return { sucesso: false, mensagem: `Erro ao executar ${name}: ${msg}` };
    }
}
