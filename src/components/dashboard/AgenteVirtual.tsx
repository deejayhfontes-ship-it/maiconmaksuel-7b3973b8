import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RefreshCw, Trash2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOOL_DECLARATIONS, executeTool } from "@/hooks/useAgenteVirtualTools";

// ── API Key (mesmo pool do gerador de imagens) ──
const KEYS_SUPABASE_URL = 'https://nzngwbknezmfthbyfjmx.supabase.co';
const KEYS_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bmd3YmtuZXptZnRoYnlmam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODU5MDIsImV4cCI6MjA4NDc2MTkwMn0.S_2Hr2KEqrEj1nHIot1fBr2U1ihojl_f-owxDhf-iAk';
let _cachedKey: string | null = null;
async function getGeminiKey(): Promise<string | null> {
    if (_cachedKey) return _cachedKey;
    try {
        const res = await fetch(
            `${KEYS_SUPABASE_URL}/rest/v1/api_keys?service=eq.gemini&is_active=eq.true&select=api_key&limit=1`,
            { headers: { apikey: KEYS_SUPABASE_ANON, Authorization: `Bearer ${KEYS_SUPABASE_ANON}` } }
        );
        const data: { api_key: string }[] = await res.json();
        _cachedKey = data[0]?.api_key ?? null;
        return _cachedKey;
    } catch { return null; }
}

// ── Tipos de mensagem ──
interface FunctionCallInfo { name: string; args: Record<string, unknown>; result: string; }
interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    time: string;
    toolCalls?: FunctionCallInfo[];
}

// ── Sistema prompt ──
const SYSTEM_PROMPT = `Você é a Max, assistente virtual inteligente do Salão Maicon Maksuel. 
Você tem acesso completo ao sistema do salão E é uma especialista em marketing para salões de beleza!

Suas capacidades — SISTEMA:
- 📅 Agendar, confirmar e cancelar horários
- 👤 Buscar clientes, ver histórico e clientes inativos  
- 💬 Enviar mensagens WhatsApp para clientes
- 📋 Criar lembretes e listas de compras
- 📊 Ver resumo do dia, agendamentos, faturamento
- ✂️ Consultar serviços e profissionais disponíveis

Suas capacidades — CRIATIVIDADE & MARKETING:
- 💡 Ideias de posts para Instagram, WhatsApp, TikTok, Facebook e Stories
- 📣 Campanhas e promoções sazonais (Dia das Mães, Natal, Carnaval, Volta às Aulas etc)
- 📝 Textos prontos para copiar: legendas, mensagens, stories, CTA
- 🔖 Hashtags estratégicas para salões de beleza
- 📋 Pesquisas de satisfação: perguntas e roteiros de pesquisa prontos
- 🎯 Estratégias de fidelização e recuperação de clientes
- 💰 Ideias de pacotes, combos e precificação
- 📆 Calendário editorial mensal de redes sociais
- 🌟 Respostas para avaliações no Google e redes sociais

Quando criar textos de post ou WhatsApp, sempre entregue o texto PRONTO para copiar e colar.
Quando sugerir hashtags, agrupe por categoria (nicho, local, serviço).
Use emojis com moderação para deixar as respostas visuais e leves.

REGRAS IMPORTANTES:
1. Sempre confirme antes de fazer ações irreversíveis (cancelar agendamento, enviar WhatsApp em massa)
2. Quando o usuário pedir para agendar, primeiro busque o cliente e o serviço, depois crie o agendamento
3. Para datas relativas como "amanhã", "próxima segunda", calcule com base em: ${new Date().toISOString().split('T')[0]} (data de hoje)
4. Para horário atual: ${new Date().toLocaleTimeString('pt-BR')}
5. Responda sempre em português brasileiro, de forma amigável e concisa
6. Quando usar ferramentas, explique o que está fazendo de forma natural
7. Para enviar WhatsApp, o celular deve estar no formato: 5511999999999 (DDI+DDD+número)`;

// ── Chamada Gemini com function calling ──
async function callGeminiWithTools(
    history: { role: string; parts: unknown[] }[],
    userMessage: string,
    onToolCall?: (name: string, args: Record<string, unknown>) => void
): Promise<{ text: string; toolCalls: FunctionCallInfo[] }> {
    const apiKey = await getGeminiKey();
    if (!apiKey) throw new Error("API key não encontrada. Configure em Configurações → Geral.");

    const allToolCalls: FunctionCallInfo[] = [];

    // Conteúdos para a requisição
    let contents = [
        ...history.slice(-12),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    const MAX_ITERATIONS = 5; // evita loops infinitos

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const body = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { error?: { message?: string } })?.error?.message || `Erro ${res.status}`);
        }

        const data = await res.json() as {
            candidates?: Array<{
                content?: {
                    role?: string;
                    parts?: Array<{
                        text?: string;
                        functionCall?: { name: string; args: Record<string, unknown> };
                    }>;
                };
            }>;
        };
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Verifica se tem function calls
        const funcCalls = parts.filter(p => p.functionCall);

        if (funcCalls.length === 0) {
            // Resposta final de texto
            const text = parts.find(p => p.text)?.text || "Não consegui gerar uma resposta.";
            return { text, toolCalls: allToolCalls };
        }

        // Adiciona a resposta do modelo ao histórico
        contents = [...contents, { role: 'model', parts }];

        // Executa as ferramentas
        const functionResponses = [];
        for (const part of funcCalls) {
            const { name, args } = part.functionCall!;
            onToolCall?.(name, args);

            const result = await executeTool(name, args);
            const responseText = JSON.stringify(result.dados ?? {}) || result.mensagem;

            allToolCalls.push({
                name,
                args,
                result: result.mensagem
            });

            functionResponses.push({
                functionResponse: {
                    name,
                    response: {
                        result: result.mensagem,
                        dados: result.dados,
                        sucesso: result.sucesso
                    }
                }
            });
        }

        // Adiciona respostas das ferramentas ao histórico
        contents = [...contents, { role: 'user', parts: functionResponses }];
    }

    return { text: "Operação concluída.", toolCalls: allToolCalls };
}

// ── Sugestões rápidas por categoria ──
const QUICK_PROMPTS = [
    { emoji: "📅", label: "Resumo do dia", msg: "Me mostre o resumo do dia de hoje", color: "violet" },
    { emoji: "👻", label: "Clientes sumidos", msg: "Quem não vem ao salão há mais de 30 dias?", color: "amber" },
    { emoji: "📸", label: "Ideia de post", msg: "Me dê 3 ideias criativas de posts para o Instagram do salão hoje", color: "pink" },
    { emoji: "📣", label: "Campanha", msg: "Crie uma campanha de WhatsApp para atrair clientes inativos", color: "blue" },
    { emoji: "🗒️", label: "Lembrete", msg: "Cria um lembrete: comprar produtos de hidratação na próxima semana", color: "green" },
    { emoji: "✂️", label: "Serviços", msg: "Quais serviços estão cadastrados no sistema?", color: "orange" },
];

// ── Robô animado ──
function RobotAvatar({ thinking = false, size = 'sm' }: { thinking?: boolean; size?: 'sm' | 'lg' }) {
    const dim = size === 'lg' ? 'w-16 h-16' : 'w-9 h-9';
    const svgDim = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
    return (
        <div className={cn("relative flex-shrink-0", dim, thinking && "animate-pulse")}>
            <div className={cn(dim, "rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md")}>
                <svg viewBox="0 0 36 36" className={svgDim} fill="none">
                    <rect x="6" y="10" width="24" height="18" rx="4" fill="white" fillOpacity="0.2" />
                    <circle cx="13" cy="18" r="2.5" fill="white" style={{ animation: thinking ? 'bounce 0.6s infinite' : 'none' }} />
                    <circle cx="23" cy="18" r="2.5" fill="white" style={{ animation: thinking ? 'bounce 0.6s 0.15s infinite' : 'none' }} />
                    <rect x="12" y="23" width="12" height="2" rx="1" fill="white" fillOpacity="0.7" />
                    <line x1="18" y1="10" x2="18" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="18" cy="5" r="2" fill="#c4b5fd" style={{ animation: thinking ? 'ping 1s infinite' : 'none' }} />
                    <rect x="3" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                    <rect x="30" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                </svg>
            </div>
            {thinking && <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />}
        </div>
    );
}

// ── Indicador de ferramenta sendo executada ──
function ToolBadge({ name, active = false }: { name: string; active?: boolean }) {
    const labels: Record<string, string> = {
        buscar_clientes: "🔍 Buscando clientes",
        buscar_clientes_inativos: "👻 Verificando clientes inativos",
        buscar_agendamentos: "📅 Consultando agenda",
        buscar_profissionais: "👥 Listando profissionais",
        buscar_servicos: "✂️ Consultando serviços",
        criar_agendamento: "📅 Criando agendamento",
        cancelar_agendamento: "❌ Cancelando agendamento",
        enviar_whatsapp: "💬 Enviando WhatsApp",
        criar_lembrete: "🗒️ Salvando lembrete",
        ver_resumo_dia: "📊 Carregando resumo do dia",
    };
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-all",
            active
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 animate-pulse"
                : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground"
        )}>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />}
            {labels[name] || name}
        </span>
    );
}

function TypingBubble({ activeTool }: { activeTool?: string }) {
    return (
        <div className="flex items-end gap-2">
            <RobotAvatar thinking />
            <div className="bg-white dark:bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-xs">
                {activeTool ? (
                    <div className="flex flex-col gap-1.5">
                        <ToolBadge name={activeTool} active />
                        <p className="text-[11px] text-muted-foreground">Aguarde...</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 h-4">
                        {[0, 1, 2].map(i => (
                            <span key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const STORAGE_KEY = 'agente_max_v2';
function loadHistory(): Message[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveHistory(msgs: Message[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* noop */ }
}

export default function AgenteVirtual() {
    const [messages, setMessages] = useState<Message[]>(() => loadHistory());
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState<string | undefined>();
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (expanded) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, [messages, loading, expanded]);

    useEffect(() => { saveHistory(messages); }, [messages]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: trimmed,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        setError(null);
        if (!expanded) setExpanded(true);

        try {
            // Monta histórico no formato Gemini
            const history = messages.flatMap(m => {
                const parts = [{ text: m.text }];
                if (m.role === 'user') return [{ role: 'user', parts }];
                return [{ role: 'model', parts }];
            });

            const { text: reply, toolCalls } = await callGeminiWithTools(
                history,
                trimmed,
                (toolName) => setActiveTool(toolName)
            );

            setActiveTool(undefined);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: reply,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e: unknown) {
            setActiveTool(undefined);
            const msg = e instanceof Error ? e.message : 'Erro desconhecido';
            setError(msg);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [loading, messages, expanded]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    const clearChat = () => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <div className={cn(
            "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20",
            "border border-violet-200/60 dark:border-violet-800/40 rounded-2xl shadow-sm overflow-hidden transition-all duration-300",
            "lg:col-span-2"
        )}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-700 cursor-pointer select-none"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <RobotAvatar thinking={loading} />
                    <div>
                        <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                            Max
                            <span className="text-violet-200 font-normal">— Agente Virtual IA</span>
                            <span className="flex items-center gap-1 bg-violet-500/40 text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                <Zap className="h-2.5 w-2.5" /> Acesso ao sistema
                            </span>
                        </h3>
                        <p className="text-violet-200 text-[11px]">
                            {loading ? (activeTool ? `🔧 ${activeTool.replace(/_/g, ' ')}...` : "Pensando...") :
                                "Agenda, WhatsApp, clientes, lembretes e muito mais ✨"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); clearChat(); }}
                            className="text-violet-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Limpar conversa"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <span className="text-violet-200">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                </div>
            </div>

            {/* Sugestões rápidas compactas */}
            {!expanded && (
                <div className="p-3 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.slice(0, 3).map(q => (
                        <button key={q.label} onClick={() => sendMessage(q.msg)} disabled={loading}
                            className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-muted border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-400 transition-all font-medium disabled:opacity-50">
                            {q.emoji} {q.label}
                        </button>
                    ))}
                    <button onClick={() => setExpanded(true)}
                        className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium">
                        + Abrir chat
                    </button>
                </div>
            )}

            {/* Área expandida */}
            {expanded && (
                <>
                    {/* Sugestões rápidas */}
                    <div className="px-3 pt-2.5 pb-1 flex flex-wrap gap-1.5 border-b border-violet-100 dark:border-violet-900/30">
                        {QUICK_PROMPTS.map(q => (
                            <button key={q.label} onClick={() => sendMessage(q.msg)} disabled={loading}
                                className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-muted border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-400 transition-all font-medium disabled:opacity-50 whitespace-nowrap">
                                {q.emoji} {q.label}
                            </button>
                        ))}
                    </div>

                    {/* Mensagens */}
                    <div className="h-80 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-4">
                                <RobotAvatar size="lg" />
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">Oi! Eu sou a Max 🤖</p>
                                    <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                                        Posso <strong>agendar horários</strong>, consultar clientes, enviar
                                        WhatsApp, criar lembretes e muito mais — tudo pelo chat!
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                                        {["Agende amanhã às 14h para Maria Corte", "Quem não veio há 30 dias?", "Resumo do dia de hoje"].map(ex => (
                                            <button key={ex} onClick={() => sendMessage(ex)}
                                                className="text-xs px-2.5 py-1 rounded-full border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                                                {ex}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start items-end")}>
                                {msg.role === 'assistant' && <RobotAvatar />}
                                <div className="flex flex-col gap-1 max-w-[82%]">
                                    {/* Badges das ferramentas usadas */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {msg.toolCalls.map((tc, i) => (
                                                <ToolBadge key={i} name={tc.name} />
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-violet-600 text-white rounded-br-sm"
                                            : "bg-white dark:bg-muted border border-border text-foreground rounded-bl-sm"
                                    )}>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        <p className={cn("text-[10px] mt-1 text-right", msg.role === 'user' ? "text-violet-200" : "text-muted-foreground")}>
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        Eu
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && <TypingBubble activeTool={activeTool} />}

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 text-sm text-destructive flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="flex-1">{error}</span>
                                <button onClick={() => setError(null)} className="text-xs underline shrink-0">Fechar</button>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-violet-200/50 dark:border-violet-800/30 px-3 py-3 bg-white/60 dark:bg-background/40">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder='Ex: "Agende amanhã às 10h para Ana Silva, corte" • "Quem não veio há 60 dias?" • "Lembre de comprar tinta"'
                                aria-label="Mensagem para Max, assistente virtual"
                                rows={1}
                                disabled={loading}
                                className="flex-1 resize-none rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all overflow-y-auto"
                                style={{ minHeight: '40px', maxHeight: '96px' }}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                                }}
                            />
                            <Button
                                onClick={() => sendMessage(input)}
                                disabled={loading || !input.trim()}
                                size="icon"
                                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 flex-shrink-0"
                            >
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center flex items-center justify-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Powered by Gemini 2.0 Flash · Conversa salva neste dispositivo
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
