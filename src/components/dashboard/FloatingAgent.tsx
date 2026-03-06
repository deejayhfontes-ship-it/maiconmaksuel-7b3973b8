import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, X, Minimize2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOL_DECLARATIONS, executeTool } from "@/hooks/useAgenteVirtualTools";

// ── API Key pool ──
const KEYS_SUPABASE_URL = 'https://nzngwbknezmfthbyfjmx.supabase.co';
const KEYS_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bmd3YmtuZXptZnRoYnlmam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODU5MDIsImV4cCI6MjA4NDc2MTkwMn0.S_2Hr2KEqrEj1nHIot1fBr2U1ihojl_f-owxDhf-iAk';
let _cachedKey: string | null = null;
async function getGeminiKey() {
    if (_cachedKey) return _cachedKey;
    try {
        const r = await fetch(
            `${KEYS_SUPABASE_URL}/rest/v1/api_keys?service=eq.gemini&is_active=eq.true&select=api_key&limit=1`,
            { headers: { apikey: KEYS_SUPABASE_ANON, Authorization: `Bearer ${KEYS_SUPABASE_ANON}` } }
        );
        const d: { api_key: string }[] = await r.json();
        _cachedKey = d[0]?.api_key ?? null;
    } catch { /* silently fail */ }
    return _cachedKey;
}

// ── System prompt ──
const SYSTEM = `Você é a Max, assistente virtual inteligente do Salão Maicon Maksuel.
Você combina acesso real ao sistema com criatividade de marketing!

SISTEMA: agendamentos, clientes inativos, WhatsApp, lembretes, serviços, profissionais, resumo do dia.
CRIATIVIDADE: posts, campanhas, hashtags, pesquisas de satisfação, fidelização, calendário editorial.

Hoje é: ${new Date().toLocaleDateString('pt-BR')} — ${new Date().toLocaleTimeString('pt-BR')}.
Sempre responda em português brasileiro, de forma amigável e concisa.
Textos de post/WhatsApp: entregue SEMPRE prontos para copiar e colar.`;

// ── Gemini com function calling ──
async function runAgent(
    history: { role: string; parts: unknown[] }[],
    userMsg: string,
    onTool: (n: string) => void
): Promise<{ text: string; tools: string[] }> {
    const key = await getGeminiKey();
    if (!key) throw new Error("Chave Gemini não encontrada. Configure em Configurações.");

    const tools: string[] = [];
    let contents = [...history.slice(-14), { role: 'user', parts: [{ text: userMsg }] }];

    for (let i = 0; i < 5; i++) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM }] },
                    contents,
                    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
                })
            }
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> } }>;
        };
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const calls = parts.filter(p => p.functionCall);
        if (!calls.length) return { text: parts.find(p => p.text)?.text ?? "Pronto!", tools };

        contents = [...contents, { role: 'model', parts }];
        const responses = [];
        for (const p of calls) {
            const { name, args } = p.functionCall!;
            onTool(name);
            tools.push(name);
            const result = await executeTool(name, args);
            responses.push({ functionResponse: { name, response: { result: result.mensagem, dados: result.dados, sucesso: result.sucesso } } });
        }
        contents = [...contents, { role: 'user', parts: responses }];
    }
    return { text: "Concluído!", tools };
}

// ── Tipos ──
interface Msg { id: string; role: 'user' | 'assistant'; text: string; time: string; tools?: string[] }

const STORAGE = 'max_v3';
const load = (): Msg[] => { try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; } };
const save = (m: Msg[]) => { try { localStorage.setItem(STORAGE, JSON.stringify(m.slice(-40))); } catch { /**/ } };

// ── Sugestões ──
const TIPS = [
    { e: "📅", t: "Resumo do dia", m: "Resumo do dia de hoje" },
    { e: "👻", t: "Clientes sumidos", m: "Quem não vem ao salão há mais de 30 dias?" },
    { e: "📸", t: "Ideia de post", m: "3 ideias criativas de posts para o Instagram do salão hoje" },
    { e: "📣", t: "Campanha", m: "Crie um texto de campanha WhatsApp para clientes inativos" },
    { e: "🏷️", t: "Hashtags", m: "Melhores hashtags para o salão no Instagram" },
    { e: "💬", t: "Texto WhatsApp", m: "Texto de WhatsApp lembrando o cliente do agendamento" },
];

const TOOL_LABEL: Record<string, string> = {
    buscar_clientes: "Buscando clientes",
    buscar_clientes_inativos: "Verificando inativos",
    buscar_agendamentos: "Consultando agenda",
    buscar_profissionais: "Listando profissionais",
    buscar_servicos: "Consultando serviços",
    criar_agendamento: "Criando agendamento",
    cancelar_agendamento: "Cancelando",
    enviar_whatsapp: "Enviando WhatsApp",
    criar_lembrete: "Salvando lembrete",
    ver_resumo_dia: "Carregando resumo",
};

// ── Robô SVG Moderno e Animado ──
function RobotIcon({ active = false, size = 28 }: { active?: boolean; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            {/* Antena */}
            <line x1="32" y1="8" x2="32" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="6" r="4" fill={active ? "#fbbf24" : "#a78bfa"}>
                {active && <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />}
                {active && <animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite" />}
            </circle>

            {/* Cabeça */}
            <rect x="10" y="16" width="44" height="32" rx="10" fill="white" fillOpacity="0.18" />
            <rect x="10" y="16" width="44" height="32" rx="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />

            {/* Olho esquerdo */}
            <circle cx="22" cy="31" r="5" fill="white" fillOpacity="0.9" />
            <circle cx="23" cy="30" r="2.5" fill="#7c3aed">
                {active && <animate attributeName="cy" values="30;28;30" dur="0.5s" repeatCount="indefinite" />}
            </circle>
            <circle cx="24" cy="29" r="1" fill="white" fillOpacity="0.9" />

            {/* Olho direito */}
            <circle cx="42" cy="31" r="5" fill="white" fillOpacity="0.9" />
            <circle cx="43" cy="30" r="2.5" fill="#7c3aed">
                {active && <animate attributeName="cy" values="30;28;30" dur="0.5s" begin="0.1s" repeatCount="indefinite" />}
            </circle>
            <circle cx="44" cy="29" r="1" fill="white" fillOpacity="0.9" />

            {/* Boca */}
            <rect x="24" y="38" width="16" height="3.5" rx="1.75" fill="white" fillOpacity="0.65" />

            {/* Orelhas / antenas laterais */}
            <rect x="6" y="24" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
            <rect x="54" y="24" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
        </svg>
    );
}

// ── Componente Principal ──
export default function FloatingAgent() {
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>(load);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pulse, setPulse] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Pulsa o botão nos primeiros 6s se chat fechado
    useEffect(() => {
        const t = setTimeout(() => setPulse(false), 6000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }, [msgs, loading, open]);

    useEffect(() => { save(msgs); }, [msgs]);

    const send = useCallback(async (text: string) => {
        const t = text.trim();
        if (!t || loading) return;
        setInput("");
        setError(null);
        if (!open) setOpen(true);

        const userMsg: Msg = { id: Date.now().toString(), role: 'user', text: t, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
        setMsgs(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const history = msgs.flatMap(m => m.role === 'user'
                ? [{ role: 'user', parts: [{ text: m.text }] }]
                : [{ role: 'model', parts: [{ text: m.text }] }]
            );
            const { text: reply, tools } = await runAgent(history, t, (n) => setActiveTool(n));
            setActiveTool(null);
            setMsgs(prev => [...prev, {
                id: (Date.now() + 1).toString(), role: 'assistant', text: reply,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                tools: tools.length ? tools : undefined
            }]);
        } catch (e: unknown) {
            setActiveTool(null);
            setError(e instanceof Error ? e.message : "Erro desconhecido");
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [loading, msgs, open]);

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    };

    return (
        <>
            {/* ── Estilos de animação ── */}
            <style>{`
                @keyframes maxFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes maxPulseRing {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes maxSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes maxDot {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                .max-float { animation: maxFloat 3s ease-in-out infinite; }
                .max-slide-up { animation: maxSlideUp 0.22s cubic-bezier(.22,1,.36,1) forwards; }
                .max-dot { animation: maxDot 1.2s ease-in-out infinite; }
                .max-dot-2 { animation-delay: 0.2s; }
                .max-dot-3 { animation-delay: 0.4s; }
            `}</style>

            {/* ── Painel de Chat ── */}
            {open && (
                <div
                    className="max-slide-up fixed bottom-24 right-4 z-[9999] w-[370px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1040 50%, #120c2e 100%)' }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                            <RobotIcon active={loading} size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-white font-bold text-sm">Max</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
                                    <Sparkles className="inline w-2.5 h-2.5 mr-0.5" />IA Gemini
                                </span>
                            </div>
                            <p className="text-[11px] truncate" style={{ color: '#a78bfa' }}>
                                {loading ? (activeTool ? `🔧 ${TOOL_LABEL[activeTool] ?? activeTool}...` : "Pensando...") : "Assistente do Maicon Maksuel"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {msgs.length > 0 && (
                                <button onClick={() => { setMsgs([]); localStorage.removeItem(STORAGE); }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Limpar"
                                    style={{ color: '#7c3aed' }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#a78bfa' }}>
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Sugestões rápidas */}
                    <div className="px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5"
                        style={{ scrollbarWidth: 'none' }}>
                        {TIPS.map(q => (
                            <button key={q.t} onClick={() => send(q.m)} disabled={loading}
                                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full border transition-all flex-shrink-0 font-medium hover:scale-105 active:scale-95"
                                style={{ borderColor: 'rgba(139,92,246,0.4)', color: '#c4b5fd', background: 'rgba(139,92,246,0.12)' }}>
                                {q.e} {q.t}
                            </button>
                        ))}
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 h-72">
                        {!msgs.length && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl max-float"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                    <RobotIcon size={40} />
                                </div>
                                <div>
                                    <p className="font-bold text-white/90">Oi! Sou a Max 👋</p>
                                    <p className="text-xs mt-1 leading-relaxed max-w-[220px]" style={{ color: '#a78bfa' }}>
                                        Tenho acesso ao sistema e sei de marketing. Me pergunte qualquer coisa!
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {["Agende amanhã às 14h para Maria, corte", "Quem sumiu há 30 dias?", "Ideia de post hoje"].map(ex => (
                                        <button key={ex} onClick={() => send(ex)}
                                            className="text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:bg-violet-900/20"
                                            style={{ borderColor: 'rgba(139,92,246,0.35)', color: '#c4b5fd' }}>
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {msgs.map(m => (
                            <div key={m.id} className={cn("flex gap-2", m.role === 'user' ? "justify-end" : "justify-start items-end")}>
                                {m.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                        <RobotIcon size={18} />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1 max-w-[80%]">
                                    {m.tools && m.tools.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {[...new Set(m.tools)].map((t, i) => (
                                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
                                                    {TOOL_LABEL[t] ?? t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                        m.role === 'user'
                                            ? "text-white rounded-br-sm"
                                            : "rounded-bl-sm"
                                    )} style={m.role === 'user'
                                        ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }
                                        : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.08)' }
                                    }>
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                        <p className="text-[10px] mt-1 text-right opacity-50">{m.time}</p>
                                    </div>
                                </div>
                                {m.role === 'user' && (
                                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                        EU
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-end gap-2">
                                <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                    <RobotIcon active size={18} />
                                </div>
                                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm"
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {activeTool ? (
                                        <p className="text-[11px]" style={{ color: '#c4b5fd' }}>
                                            🔧 {TOOL_LABEL[activeTool] ?? activeTool}...
                                        </p>
                                    ) : (
                                        <div className="flex gap-1 items-center h-4">
                                            {[0, 1, 2].map(i => (
                                                <span key={i} className={cn("w-2 h-2 rounded-full max-dot", i === 1 && "max-dot-2", i === 2 && "max-dot-3")}
                                                    style={{ background: '#7c3aed' }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <span className="flex-1">{error}</span>
                                <button onClick={() => setError(null)} className="underline shrink-0">Fechar</button>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-white/8"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={onKey}
                                disabled={loading}
                                rows={1}
                                placeholder='Pergunte ou peça algo... (Enter envia)'
                                aria-label="Mensagem para Max"
                                className="flex-1 resize-none text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all overflow-y-auto"
                                style={{
                                    background: 'rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.9)',
                                    border: '1px solid rgba(139,92,246,0.25)',
                                    minHeight: '40px',
                                    maxHeight: '96px',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.7)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; }}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                                }}
                            />
                            <button
                                onClick={() => send(input)}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                            >
                                <Send className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Botão Flutuante ── */}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-center gap-2">
                {/* Tooltip quando fechado */}
                {!open && msgs.length > 0 && (
                    <div className="absolute bottom-16 right-0 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none"
                        style={{ background: 'linear-gradient(135deg, #1a1040, #120c2e)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                        {msgs.length} mensagens salvas
                        <ChevronDown className="inline w-3 h-3 ml-1" />
                    </div>
                )}

                {/* Ring de pulso */}
                {pulse && !open && (
                    <div className="absolute inset-0 rounded-full pointer-events-none"
                        style={{ animation: 'maxPulseRing 1.8s ease-out infinite', background: 'rgba(124,58,237,0.5)' }} />
                )}

                {/* Botão principal */}
                <button
                    onClick={() => setOpen(v => !v)}
                    title={open ? "Fechar Max" : "Abrir Max — Assistente IA"}
                    className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 relative overflow-hidden hover:scale-110 active:scale-95",
                        !open && "max-float"
                    )}
                    style={{
                        background: open
                            ? 'linear-gradient(135deg, #4c1d95, #3730a3)'
                            : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        boxShadow: '0 8px 32px rgba(124,58,237,0.6), 0 2px 8px rgba(0,0,0,0.4)',
                    }}
                >
                    {/* Brilho interno */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25) 0%, transparent 60%)' }} />
                    {open
                        ? <X className="w-6 h-6 text-white relative z-10" />
                        : <RobotIcon active={loading} size={32} />
                    }

                    {/* Badge de loading */}
                    {loading && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                    )}
                </button>

                {/* Label "Max" abaixo do botão */}
                {!open && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
                        Max IA
                    </span>
                )}
            </div>
        </>
    );
}
