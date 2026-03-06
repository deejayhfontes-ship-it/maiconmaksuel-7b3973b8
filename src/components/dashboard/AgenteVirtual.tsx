import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Configuração da API Key (mesmo projeto Supabase separado) ──
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
    } catch {
        return null;
    }
}

async function callGeminiText(messages: { role: string; text: string }[], userMessage: string): Promise<string> {
    const apiKey = await getGeminiKey();
    if (!apiKey) throw new Error("API key não encontrada");

    // Monta histórico + sistema
    const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const body = {
        system_instruction: {
            parts: [{
                text: `Você é a Max, assistente virtual inteligente do Salão Maicon Maksuel. 
Você ajuda a equipe com:
- 💡 Ideias criativas de posts para Instagram/WhatsApp/TikTok
- 📣 Sugestões de campanhas e promoções para o salão
- 📅 Estratégias de marketing sazonal (Dia das Mães, Natal, Carnaval, etc)
- 💬 Textos de WhatsApp para clientes (confirmação, lembrete, promoções)
- ✅ Respostas a dúvidas sobre gestão de salão de beleza
- 🎨 Sugestões de hashtags e legendas para redes sociais

Responda sempre em português do Brasil, de forma amigável, objetiva e criativa.
Quando sugerir posts ou textos, sempre forneça o texto pronto para copiar e colar.
Use emojis com moderação para tornar a resposta mais visual.
Seja concisa: respostas entre 150-400 palavras são ideais.`
            }]
        },
        contents: [
            ...history,
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
    };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erro ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Não consegui gerar uma resposta.";
}

// ── Sugestões rápidas ──
const QUICK_PROMPTS = [
    { emoji: "📸", label: "Ideia de post", msg: "Me dê 3 ideias criativas de posts para o Instagram do salão esta semana" },
    { emoji: "📣", label: "Campanha", msg: "Crie uma campanha de promoção para atrair clientes novos este mês" },
    { emoji: "💬", label: "Texto WhatsApp", msg: "Escreva uma mensagem de WhatsApp para lembrar clientes do agendamento" },
    { emoji: "🏷️", label: "Hashtags", msg: "Quais as melhores hashtags para posts de salão de beleza no Instagram?" },
    { emoji: "🎁", label: "Promoção", msg: "Crie uma promoção especial de fim de semana para o salão" },
    { emoji: "⭐", label: "Fidelização", msg: "Como posso fidelizar mais clientes no salão? Me dê estratégias práticas" },
];

// ── Animação do Robô ──
function RobotAvatar({ thinking = false }: { thinking?: boolean }) {
    return (
        <div className={cn(
            "relative w-9 h-9 flex-shrink-0",
            thinking && "animate-pulse"
        )}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md">
                <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
                    {/* Cabeça */}
                    <rect x="6" y="10" width="24" height="18" rx="4" fill="white" fillOpacity="0.2" />
                    {/* Olhos */}
                    <circle cx="13" cy="18" r="2.5" fill="white" className={cn(thinking && "animate-bounce")} />
                    <circle cx="23" cy="18" r="2.5" fill="white" className={cn(thinking && "animate-bounce [animation-delay:0.15s]")} />
                    {/* Boca */}
                    <rect x="12" y="23" width="12" height="2" rx="1" fill="white" fillOpacity="0.7" />
                    {/* Antena */}
                    <line x1="18" y1="10" x2="18" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="18" cy="5" r="2" fill="#c4b5fd" className={cn(thinking && "animate-ping")} />
                    {/* Orelhas */}
                    <rect x="3" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                    <rect x="30" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                </svg>
            </div>
            {thinking && (
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            )}
        </div>
    );
}

// ── Bolha de digitação ──
function TypingBubble() {
    return (
        <div className="flex items-end gap-2">
            <RobotAvatar thinking />
            <div className="bg-white dark:bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 h-4">
                    {[0, 1, 2].map(i => (
                        <span
                            key={i}
                            className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface Message { id: string; role: 'user' | 'assistant'; text: string; time: string; }

const STORAGE_KEY = 'agente_max_history';

function loadHistory(): Message[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveHistory(msgs: Message[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30))); } catch { /* noop */ }
}

export default function AgenteVirtual() {
    const [messages, setMessages] = useState<Message[]>(() => loadHistory());
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll para o fim quando novas mensagens chegam
    useEffect(() => {
        if (expanded) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [messages, loading, expanded]);

    // Salva histórico
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
            const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
            const reply = await callGeminiText(history, trimmed);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: reply,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erro desconhecido';
            setError(msg);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [loading, messages, expanded]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
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
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-700 cursor-pointer"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <RobotAvatar thinking={loading} />
                    <div>
                        <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
                            Max <span className="text-violet-200">— Assistente Virtual</span>
                            <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                        </h3>
                        <p className="text-violet-200 text-[11px]">
                            {loading ? "Pensando..." : "Ideias de posts, campanhas, textos e mais ✨"}
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
                    <button className="text-violet-200 hover:text-white p-1 transition-colors">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Sugestões rápidas (sempre visíveis) */}
            {!expanded && (
                <div className="p-3 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.slice(0, 3).map(q => (
                        <button
                            key={q.label}
                            onClick={() => sendMessage(q.msg)}
                            disabled={loading}
                            className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-muted border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-400 transition-all font-medium disabled:opacity-50"
                        >
                            {q.emoji} {q.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                    >
                        + Ver tudo
                    </button>
                </div>
            )}

            {/* Chat expandido */}
            {expanded && (
                <>
                    {/* Sugestões rápidas todas */}
                    <div className="px-3 pt-3 pb-1 flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map(q => (
                            <button
                                key={q.label}
                                onClick={() => sendMessage(q.msg)}
                                disabled={loading}
                                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-muted border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-400 transition-all font-medium disabled:opacity-50 whitespace-nowrap"
                            >
                                {q.emoji} {q.label}
                            </button>
                        ))}
                    </div>

                    {/* Mensagens */}
                    <div className="h-72 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
                                    <svg viewBox="0 0 36 36" className="w-10 h-10" fill="none">
                                        <rect x="6" y="10" width="24" height="18" rx="4" fill="white" fillOpacity="0.25" />
                                        <circle cx="13" cy="18" r="2.5" fill="white" />
                                        <circle cx="23" cy="18" r="2.5" fill="white" />
                                        <rect x="12" y="23" width="12" height="2" rx="1" fill="white" fillOpacity="0.7" />
                                        <line x1="18" y1="10" x2="18" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="18" cy="5" r="2" fill="#c4b5fd" />
                                        <rect x="3" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                                        <rect x="30" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">Oi! Eu sou a Max 👋</p>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Sua assistente virtual de marketing. Clique em uma sugestão ou me faça uma pergunta!
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start items-end")}>
                                {msg.role === 'assistant' && <RobotAvatar />}
                                <div className={cn(
                                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-violet-600 text-white rounded-br-sm"
                                        : "bg-white dark:bg-muted border border-border text-foreground rounded-bl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <p className={cn("text-[10px] mt-1 text-right", msg.role === 'user' ? "text-violet-200" : "text-muted-foreground")}>
                                        {msg.time}
                                    </p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        Eu
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && <TypingBubble />}

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-sm text-destructive flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{error}</span>
                                <button onClick={() => setError(null)} className="ml-auto text-xs underline">Fechar</button>
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
                                placeholder="Peça uma ideia de post, campanha, texto... (Enter para enviar)"
                                aria-label="Mensagem para Max, assistente virtual"
                                rows={1}
                                className="flex-1 resize-none rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all max-h-32 overflow-y-auto"
                                style={{ minHeight: '40px' }}
                                disabled={loading}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                                }}
                            />
                            <Button
                                onClick={() => sendMessage(input)}
                                disabled={loading || !input.trim()}
                                size="icon"
                                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 flex-shrink-0"
                            >
                                {loading
                                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                                    : <Send className="h-4 w-4" />
                                }
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                            Powered by Google Gemini · A conversa fica salva neste dispositivo
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
