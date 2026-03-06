import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOL_DECLARATIONS, executeTool } from "@/hooks/useAgenteVirtualTools";

// ── Paleta Dourada ──
const G = {
    btn: 'linear-gradient(135deg, #e5b830 0%, #b8860b 60%, #8b6914 100%)',
    btnOpen: 'linear-gradient(135deg, #5c3800 0%, #3d2500 100%)',
    glow: 'rgba(212,160,23,0.5)',
    accent: '#d4a017',
    light: '#f0c853',
    muted: '#b8972f',
    chip: 'rgba(212,160,23,0.18)',
    chipBd: 'rgba(212,160,23,0.35)',
    user: 'linear-gradient(135deg, #b8860b, #7a5c00)',
    glass: 'rgba(15,10,2,0.72)',
};

// ── API Key ──
const SB_URL = 'https://nzngwbknezmfthbyfjmx.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bmd3YmtuZXptZnRoYnlmam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODU5MDIsImV4cCI6MjA4NDc2MTkwMn0.S_2Hr2KEqrEj1nHIot1fBr2U1ihojl_f-owxDhf-iAk';
let _key: string | null = null;
async function getKey() {
    if (_key) return _key;
    try {
        const r = await fetch(`${SB_URL}/rest/v1/api_keys?service=eq.gemini&is_active=eq.true&select=api_key&limit=1`,
            { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } });
        const d: { api_key: string }[] = await r.json();
        _key = d[0]?.api_key ?? null;
    } catch { /**/ }
    return _key;
}

const SYSTEM = `Você é a Max, assistente inteligente do Salão Maicon Maksuel.
Acesso real ao sistema: agendamentos, clientes, WhatsApp, lembretes, resumos.
Criatividade: posts, campanhas, hashtags, fidelização.
Hoje: ${new Date().toLocaleDateString('pt-BR')}. Responda em português, de forma breve e direta.
Textos de post/WhatsApp: sempre prontos para copiar.`;

async function runAgent(
    history: { role: string; parts: unknown[] }[],
    msg: string,
    onTool: (n: string) => void
): Promise<{ text: string; tools: string[] }> {
    const key = await getKey();
    if (!key) throw new Error("Chave Gemini não configurada.");
    const tools: string[] = [];
    let contents = [...history.slice(-12), { role: 'user', parts: [{ text: msg }] }];
    for (let i = 0; i < 5; i++) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM }] }, contents,
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
            onTool(name); tools.push(name);
            const r = await executeTool(name, args);
            responses.push({ functionResponse: { name, response: { result: r.mensagem, dados: r.dados } } });
        }
        contents = [...contents, { role: 'user', parts: responses }];
    }
    return { text: "Concluído!", tools };
}

interface Msg { id: string; role: 'user' | 'ai'; text: string; time: string; tools?: string[] }
const KEY = 'max_v5';
const load = (): Msg[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (m: Msg[]) => { try { localStorage.setItem(KEY, JSON.stringify(m.slice(-30))); } catch { /**/ } };

const TIPS = [
    { e: "📅", m: "Resumo do dia de hoje" },
    { e: "👻", m: "Quem não vem há 30 dias?" },
    { e: "📸", m: "3 ideias de posts para o Instagram" },
    { e: "📣", m: "Campanha WhatsApp para inativos" },
];
const TOOL_LABEL: Record<string, string> = {
    buscar_clientes: "clientes", buscar_clientes_inativos: "inativos",
    buscar_agendamentos: "agenda", buscar_profissionais: "profissionais",
    buscar_servicos: "serviços", criar_agendamento: "agendamento",
    cancelar_agendamento: "cancelar", enviar_whatsapp: "WhatsApp",
    criar_lembrete: "lembrete", ver_resumo_dia: "resumo",
};

// ── Robô Dourado ──
function Bot({ active = false, size = 28 }: { active?: boolean; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <line x1="32" y1="7" x2="32" y2="15" stroke="#f0c853" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="5" r="4" fill={active ? "#fff" : "#d4a017"}>
                {active && <animate attributeName="r" values="4;6;4" dur=".7s" repeatCount="indefinite" />}
            </circle>
            <rect x="9" y="15" width="46" height="33" rx="11" fill="#1a1200" fillOpacity=".8" />
            <rect x="9" y="15" width="46" height="33" rx="11" stroke="#d4a017" strokeOpacity=".6" strokeWidth="1.5" />
            <circle cx="22" cy="31" r="5" fill="#d4a017" fillOpacity=".2" />
            <circle cx="22" cy="31" r="3.2" fill="#f0c853">
                {active && <animate attributeName="r" values="3.2;2;3.2" dur=".6s" repeatCount="indefinite" />}
            </circle>
            <circle cx="23.5" cy="29.5" r="1" fill="white" fillOpacity=".9" />
            <circle cx="42" cy="31" r="5" fill="#d4a017" fillOpacity=".2" />
            <circle cx="42" cy="31" r="3.2" fill="#f0c853">
                {active && <animate attributeName="r" values="3.2;2;3.2" dur=".6s" begin=".1s" repeatCount="indefinite" />}
            </circle>
            <circle cx="43.5" cy="29.5" r="1" fill="white" fillOpacity=".9" />
            <path d="M24 39 Q32 44.5 40 39" stroke="#d4a017" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="5" y="23" width="4" height="10" rx="2" fill="#d4a017" fillOpacity=".45" />
            <rect x="55" y="23" width="4" height="10" rx="2" fill="#d4a017" fillOpacity=".45" />
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

    // ── Posição drag — começa bottom-left ──
    // Usamos top/left absoluto calculado a partir do bottom-left inicial
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const btnRef = useRef<HTMLDivElement>(null);
    const isDrag = useRef(false);
    const moved = useRef(false);

    // Calcula posição inicial após mount (bottom-left: x=20, y = altura - 90)
    useEffect(() => {
        setPos({ x: 20, y: window.innerHeight - 90 });
    }, []);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { const t = setTimeout(() => setPulse(false), 5000); return () => clearTimeout(t); }, []);
    useEffect(() => { if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); }, [msgs, loading, open]);
    useEffect(() => { save(msgs); }, [msgs]);

    // ── Drag via Pointer Events (setPointerCapture — mais confiável) ──
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDrag.current = true;
        moved.current = false;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDrag.current) return;
        moved.current = true;
        const btnW = 56, btnH = 68; // largura e altura aprox do grupo botao
        const newX = Math.max(8, Math.min(window.innerWidth - btnW - 8, e.clientX - btnW / 2));
        const newY = Math.max(8, Math.min(window.innerHeight - btnH - 8, e.clientY - btnH / 2));
        setPos({ x: newX, y: newY });
    }, []);

    const handlePointerUp = useCallback(() => {
        isDrag.current = false;
    }, []);

    const handleClick = useCallback(() => {
        if (!moved.current) setOpen(v => !v);
        moved.current = false;
    }, []);

    // ── Send ──
    const send = useCallback(async (text: string) => {
        const t = text.trim();
        if (!t || loading) return;
        setInput(""); setError(null);
        if (!open) setOpen(true);
        const userMsg: Msg = {
            id: Date.now().toString(), role: 'user', text: t,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMsgs(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const history = msgs.flatMap(m => m.role === 'user'
                ? [{ role: 'user', parts: [{ text: m.text }] }]
                : [{ role: 'model', parts: [{ text: m.text }] }]);
            const { text: reply, tools } = await runAgent(history, t, n => setActiveTool(n));
            setActiveTool(null);
            setMsgs(prev => [...prev, {
                id: (Date.now() + 1).toString(), role: 'ai', text: reply,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                tools: tools.length ? tools : undefined
            }]);
        } catch (e: unknown) {
            setActiveTool(null);
            setError(e instanceof Error ? e.message : "Erro");
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [loading, msgs, open]);

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    };

    if (!pos) return null; // aguarda mount para calcular posição

    // Painel: aparece acima do botão
    const panelBottom = window.innerHeight - pos.y + 12;

    return (
        <>
            <style>{`
                @keyframes maxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
                @keyframes maxPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2);opacity:0} }
                @keyframes maxSlide { from{opacity:0;transform:translateY(10px) scale(.96)} to{opacity:1;transform:none} }
                @keyframes maxDot   { 0%,80%,100%{transform:scale(.5);opacity:.3} 40%{transform:scale(1);opacity:1} }
                .mfloat { animation:maxFloat 3s ease-in-out infinite; }
                .mslide { animation:maxSlide .2s cubic-bezier(.22,1,.36,1) forwards; }
                .mdot   { animation:maxDot 1.2s ease-in-out infinite; }
                .mdot2  { animation-delay:.2s; }
                .mdot3  { animation-delay:.4s; }
            `}</style>

            {/* ── Painel Glass ── */}
            {open && (
                <div className="mslide fixed z-[9997] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                        left: Math.min(pos.x, window.innerWidth - 370),
                        bottom: panelBottom,
                        width: 350,
                        maxWidth: 'calc(100vw - 24px)',
                        background: G.glass,
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(212,160,23,0.2)',
                        boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,160,23,0.1)`,
                    }}>

                    {/* Header minimalista */}
                    <div className="flex items-center gap-2.5 px-4 py-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: G.btn }}>
                            <Bot active={loading} size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm leading-none flex items-center gap-1.5">
                                Max
                                <span className="text-[10px] px-1.5 py-px rounded-full font-normal"
                                    style={{ background: G.chip, color: G.light }}>
                                    <Sparkles className="inline w-2.5 h-2.5 mr-0.5" />IA
                                </span>
                            </p>
                            {loading && (
                                <p className="text-[11px] mt-0.5" style={{ color: G.muted }}>
                                    {activeTool ? `${TOOL_LABEL[activeTool] ?? activeTool}...` : "Pensando..."}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-0.5">
                            {msgs.length > 0 && (
                                <button onClick={() => { setMsgs([]); localStorage.removeItem(KEY); }}
                                    title="Limpar" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                    style={{ color: G.muted }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: G.muted }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Linha divisória sutil */}
                    <div style={{ height: 1, background: 'rgba(212,160,23,0.12)' }} />

                    {/* Mensagens */}
                    <div className="overflow-y-auto px-3.5 py-3 space-y-2.5" style={{ height: 260 }}>
                        {!msgs.length && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mfloat"
                                    style={{ background: G.btn, boxShadow: `0 6px 20px ${G.glow}` }}>
                                    <Bot size={32} />
                                </div>
                                <p className="text-white/80 text-sm font-medium">Oi! Sou a Max 👋</p>
                                <p className="text-[11px] max-w-[200px] leading-relaxed" style={{ color: G.muted }}>
                                    Acesso ao sistema + marketing. Me pergunte qualquer coisa!
                                </p>
                                {/* Chips compactos */}
                                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                                    {TIPS.map(q => (
                                        <button key={q.m} onClick={() => send(q.m)}
                                            className="text-[11px] px-2.5 py-1 rounded-full border transition-all hover:scale-105"
                                            style={{ borderColor: G.chipBd, color: G.light, background: G.chip }}>
                                            {q.e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {msgs.map(m => (
                            <div key={m.id} className={cn("flex gap-2", m.role === 'user' ? "justify-end" : "justify-start items-end")}>
                                {m.role === 'ai' && (
                                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center"
                                        style={{ background: G.btn }}>
                                        <Bot size={16} />
                                    </div>
                                )}
                                <div className="max-w-[82%]">
                                    {/* tool badges só se tiver ferramentas */}
                                    {m.tools && m.tools.length > 0 && (
                                        <p className="text-[11px] mb-1" style={{ color: G.muted }}>
                                            🔧 {[...new Set(m.tools)].map(t => TOOL_LABEL[t] ?? t).join(', ')}
                                        </p>
                                    )}
                                    <div className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                        m.role === 'user' ? "text-white rounded-br-sm" : "rounded-bl-sm"
                                    )} style={m.role === 'user'
                                        ? { background: G.user }
                                        : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)' }
                                    }>
                                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.text}</p>
                                        <p className="text-[11px] mt-1 text-right opacity-35">{m.time}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-end gap-2">
                                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: G.btn }}>
                                    <Bot active size={16} />
                                </div>
                                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm"
                                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                                    <div className="flex gap-1 items-center h-3.5">
                                        {[0, 1, 2].map(i => (
                                            <span key={i} className={cn("w-1.5 h-1.5 rounded-full mdot", i === 1 && "mdot2", i === 2 && "mdot3")}
                                                style={{ background: G.accent }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl px-3 py-2 text-[12px] flex items-center gap-2"
                                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
                                <span className="flex-1">{error}</span>
                                <button onClick={() => setError(null)} className="underline shrink-0 text-[11px]">✕</button>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{ height: 1, background: 'rgba(212,160,23,0.1)' }} />
                    <div className="flex gap-2 items-end px-3 py-2.5">
                        <textarea
                            ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={onKey} disabled={loading} rows={1}
                            placeholder="Pergunte ou peça algo... (Enter envia)"
                            aria-label="Mensagem para Max"
                            className="flex-1 resize-none text-[15px] rounded-xl px-3 py-2 focus:outline-none bg-transparent"
                            style={{
                                color: 'rgba(255,255,255,0.88)',
                                border: '1px solid rgba(212,160,23,0.2)',
                                minHeight: 36, maxHeight: 80,
                                scrollbarWidth: 'none',
                                background: 'rgba(255,255,255,0.05)',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.65)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.2)'; }}
                            onInput={e => {
                                const el = e.currentTarget; el.style.height = 'auto';
                                el.style.height = Math.min(el.scrollHeight, 80) + 'px';
                            }}
                        />
                        <button onClick={() => send(input)} disabled={loading || !input.trim()}
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-35"
                            style={{ background: G.btn }}>
                            <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Botão Flutuante — drag completo via pointer events ── */}
            <div
                ref={btnRef}
                style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, touchAction: 'none', userSelect: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
            >
                {/* Ring de pulso */}
                {pulse && !open && (
                    <div className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ animation: 'maxPulse 1.8s ease-out infinite', background: G.glow }} />
                )}

                <div className="flex flex-col items-center gap-1">
                    <div
                        className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden cursor-pointer transition-all duration-200", !open && "mfloat")}
                        style={{
                            background: open ? G.btnOpen : G.btn,
                            boxShadow: `0 8px 28px ${G.glow}, 0 2px 8px rgba(0,0,0,0.5)`,
                        }}>
                        <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
                        {open
                            ? <X className="w-6 h-6 text-white z-10 relative" />
                            : <Bot active={loading} size={32} />
                        }
                        {loading && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                        )}
                    </div>
                    {!open && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none"
                            style={{ background: 'rgba(212,160,23,0.18)', color: G.accent }}>
                            Max IA
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}
