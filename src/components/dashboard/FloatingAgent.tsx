import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, X, Minimize2, Sparkles, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOL_DECLARATIONS, executeTool } from "@/hooks/useAgenteVirtualTools";

// ── Paleta Dourada ──
const GOLD = {
    primary: 'linear-gradient(135deg, #d4a017 0%, #8b6914 100%)',
    button: 'linear-gradient(135deg, #e5b830 0%, #b8860b 50%, #8b6914 100%)',
    buttonOpen: 'linear-gradient(135deg, #7a4f00 0%, #5c3800 100%)',
    glow: 'rgba(212,160,23,0.55)',
    pulse: 'rgba(212,160,23,0.45)',
    accent: '#d4a017',
    light: '#f0c853',
    muted: '#c8972f',
    bgBase: 'linear-gradient(160deg, #0f0c06 0%, #1a1200 50%, #120d00 100%)',
    chipBg: 'rgba(212,160,23,0.14)',
    chipBorder: 'rgba(212,160,23,0.4)',
    chipColor: '#f0c853',
    userBubble: 'linear-gradient(135deg, #b8860b, #8b6914)',
    toolBadge: 'rgba(212,160,23,0.18)',
    toolColor: '#f0c853',
};

// ── API Key pool ──
const KEYS_URL = 'https://nzngwbknezmfthbyfjmx.supabase.co';
const KEYS_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bmd3YmtuZXptZnRoYnlmam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODU5MDIsImV4cCI6MjA4NDc2MTkwMn0.S_2Hr2KEqrEj1nHIot1fBr2U1ihojl_f-owxDhf-iAk';
let _cachedKey: string | null = null;
async function getGeminiKey() {
    if (_cachedKey) return _cachedKey;
    try {
        const r = await fetch(`${KEYS_URL}/rest/v1/api_keys?service=eq.gemini&is_active=eq.true&select=api_key&limit=1`,
            { headers: { apikey: KEYS_ANON, Authorization: `Bearer ${KEYS_ANON}` } });
        const d: { api_key: string }[] = await r.json();
        _cachedKey = d[0]?.api_key ?? null;
    } catch { /* silent */ }
    return _cachedKey;
}

// ── System Prompt ──
const SYSTEM = `Você é a Max, assistente virtual inteligente do Salão Maicon Maksuel.
Você combina acesso real ao sistema com criatividade de marketing!

SISTEMA: agendamentos, clientes inativos, WhatsApp, lembretes, serviços, profissionais, resumo do dia.
CRIATIVIDADE: posts Instagram/TikTok/WhatsApp, campanhas sazonais, hashtags, pesquisas de satisfação, calendário editorial.

Hoje é: ${new Date().toLocaleDateString('pt-BR')}, ${new Date().toLocaleTimeString('pt-BR')}.
Responda em português brasileiro, de forma amigável e concisa.
Textos de post/WhatsApp: entregue SEMPRE prontos para copiar.`;

// ── Gemini Loop ──
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
            responses.push({ functionResponse: { name, response: { result: r.mensagem, dados: r.dados, sucesso: r.sucesso } } });
        }
        contents = [...contents, { role: 'user', parts: responses }];
    }
    return { text: "Concluído!", tools };
}

interface Msg { id: string; role: 'user' | 'assistant'; text: string; time: string; tools?: string[] }
const STORAGE = 'max_v4';
const load = (): Msg[] => { try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; } };
const save = (m: Msg[]) => { try { localStorage.setItem(STORAGE, JSON.stringify(m.slice(-40))); } catch { /**/ } };

const TIPS = [
    { e: "📅", t: "Resumo do dia", m: "Resumo do dia de hoje" },
    { e: "👻", t: "Clientes sumidos", m: "Quem não vem ao salão há mais de 30 dias?" },
    { e: "📸", t: "Ideia de post", m: "3 ideias criativas de posts para o Instagram do salão hoje" },
    { e: "📣", t: "Campanha", m: "Crie um texto de campanha WhatsApp para clientes inativos" },
    { e: "🏷️", t: "Hashtags", m: "Melhores hashtags para o salão no Instagram" },
    { e: "💬", t: "Texto WhatsApp", m: "Texto de WhatsApp lembrando o cliente do agendamento" },
];

const TOOL_LABEL: Record<string, string> = {
    buscar_clientes: "Buscando clientes", buscar_clientes_inativos: "Verificando inativos",
    buscar_agendamentos: "Consultando agenda", buscar_profissionais: "Listando profissionais",
    buscar_servicos: "Consultando serviços", criar_agendamento: "Criando agendamento",
    cancelar_agendamento: "Cancelando", enviar_whatsapp: "Enviando WhatsApp",
    criar_lembrete: "Salvando lembrete", ver_resumo_dia: "Carregando resumo",
};

// ── Robô dourado animado ──
function RobotIcon({ active = false, size = 28 }: { active?: boolean; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            {/* Antena */}
            <line x1="32" y1="8" x2="32" y2="16" stroke="#f0c853" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="6" r="4" fill={active ? "#fff" : "#d4a017"}>
                {active && <animate attributeName="r" values="4;6;4" dur="0.7s" repeatCount="indefinite" />}
                {active && <animate attributeName="opacity" values="1;0.4;1" dur="0.7s" repeatCount="indefinite" />}
            </circle>

            {/* Cabeça */}
            <rect x="10" y="16" width="44" height="32" rx="10" fill="#1a1200" fillOpacity="0.7" />
            <rect x="10" y="16" width="44" height="32" rx="10" stroke="#d4a017" strokeOpacity="0.7" strokeWidth="1.5" />
            {/* brilho superior */}
            <rect x="10" y="16" width="44" height="10" rx="10" fill="url(#goldShine)" fillOpacity="0.25" />

            {/* Olhos */}
            <circle cx="22" cy="31" r="5.5" fill="#d4a017" fillOpacity="0.25" />
            <circle cx="22" cy="31" r="3.5" fill="#f0c853">
                {active && <animate attributeName="r" values="3.5;2.5;3.5" dur="0.6s" repeatCount="indefinite" />}
            </circle>
            <circle cx="23.5" cy="29.5" r="1.2" fill="white" fillOpacity="0.9" />

            <circle cx="42" cy="31" r="5.5" fill="#d4a017" fillOpacity="0.25" />
            <circle cx="42" cy="31" r="3.5" fill="#f0c853">
                {active && <animate attributeName="r" values="3.5;2.5;3.5" dur="0.6s" begin="0.1s" repeatCount="indefinite" />}
            </circle>
            <circle cx="43.5" cy="29.5" r="1.2" fill="white" fillOpacity="0.9" />

            {/* Boca sorridente */}
            <path d="M24 39 Q32 44 40 39" stroke="#d4a017" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Orelhas */}
            <rect x="6" y="24" width="4" height="10" rx="2" fill="#d4a017" fillOpacity="0.5" />
            <rect x="54" y="24" width="4" height="10" rx="2" fill="#d4a017" fillOpacity="0.5" />

            <defs>
                <linearGradient id="goldShine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0c853" />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
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

    // ── Drag state ──
    const [pos, setPos] = useState({ x: 20, y: -1 }); // x=left, y=-1 significa "usar bottom"
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const btnRef = useRef<HTMLDivElement>(null);
    const hasMoved = useRef(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Posição inicial: bottom-left (longe do WhatsApp que fica bottom-right)
    // x=20 (left), y será calculado como distância do BOTTOM
    const [bottomOffset, setBottomOffset] = useState(20);

    useEffect(() => {
        const t = setTimeout(() => setPulse(false), 6000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }, [msgs, loading, open]);

    useEffect(() => { save(msgs); }, [msgs]);

    // ── Drag handlers ──
    const onDragStart = useCallback((clientX: number, clientY: number) => {
        if (!btnRef.current) return;
        isDragging.current = true;
        hasMoved.current = false;
        const rect = btnRef.current.getBoundingClientRect();
        dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
        document.body.style.userSelect = 'none';
    }, []);

    const onDragMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging.current) return;
        hasMoved.current = true;
        const newX = Math.max(8, Math.min(window.innerWidth - 64, clientX - dragOffset.current.x));
        const newY = Math.max(8, Math.min(window.innerHeight - 64, clientY - dragOffset.current.y));
        setPos({ x: newX, y: newY });
        // Recalcula bottomOffset para o painel de chat
        setBottomOffset(window.innerHeight - newY);
    }, []);

    const onDragEnd = useCallback(() => {
        isDragging.current = false;
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        const mm = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
        const mu = () => onDragEnd();
        const tm = (e: TouchEvent) => { onDragMove(e.touches[0].clientX, e.touches[0].clientY); };
        const tu = () => onDragEnd();
        window.addEventListener('mousemove', mm);
        window.addEventListener('mouseup', mu);
        window.addEventListener('touchmove', tm, { passive: true });
        window.addEventListener('touchend', tu);
        return () => {
            window.removeEventListener('mousemove', mm);
            window.removeEventListener('mouseup', mu);
            window.removeEventListener('touchmove', tm);
            window.removeEventListener('touchend', tu);
        };
    }, [onDragMove, onDragEnd]);

    // Posição do botão: se pos.y === -1 usa bottom-5 left-5, senão usa top/left absoluto
    const btnStyle: React.CSSProperties = pos.y === -1
        ? { position: 'fixed', bottom: 20, left: pos.x, zIndex: 9999 }
        : { position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999 };

    // Painel: aparece acima do botão
    const panelBottom = pos.y === -1
        ? 96  // 20 (margin) + 56 (btn) + 20 (gap) = 96
        : Math.max(8, window.innerHeight - pos.y + 8);

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
            <style>{`
                @keyframes maxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes maxPulse { 0%{transform:scale(1);opacity:.65} 100%{transform:scale(1.9);opacity:0} }
                @keyframes maxSlide { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes maxDot   { 0%,80%,100%{transform:scale(.55);opacity:.35} 40%{transform:scale(1);opacity:1} }
                .max-float  { animation: maxFloat 3s ease-in-out infinite; }
                .max-slide  { animation: maxSlide .22s cubic-bezier(.22,1,.36,1) forwards; }
                .max-dot    { animation: maxDot 1.2s ease-in-out infinite; }
                .max-dot2   { animation-delay:.2s; }
                .max-dot3   { animation-delay:.4s; }
                .max-grab   { cursor: grab; }
                .max-grab:active { cursor: grabbing; }
            `}</style>

            {/* ── Painel de Chat ── */}
            {open && (
                <div className="max-slide fixed z-[9998] w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
                    style={{
                        left: Math.min(pos.x, window.innerWidth - 376),
                        bottom: panelBottom,
                        background: GOLD.bgBase,
                        borderColor: 'rgba(212,160,23,0.25)',
                    }}>

                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(212,160,23,0.15)', background: 'rgba(212,160,23,0.06)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: GOLD.primary }}>
                            <RobotIcon active={loading} size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-white font-bold text-sm">Max</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: GOLD.chipBg, color: GOLD.light }}>
                                    <Sparkles className="inline w-2.5 h-2.5 mr-0.5" />IA Gemini
                                </span>
                            </div>
                            <p className="text-[11px] truncate" style={{ color: GOLD.muted }}>
                                {loading ? (activeTool ? `🔧 ${TOOL_LABEL[activeTool] ?? activeTool}...` : "Pensando...") : "Assistente do Maicon Maksuel"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {msgs.length > 0 && (
                                <button onClick={() => { setMsgs([]); localStorage.removeItem(STORAGE); }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                    title="Limpar conversa" style={{ color: GOLD.muted }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: GOLD.muted }}>
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chips de sugestão */}
                    <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b" style={{ scrollbarWidth: 'none', borderColor: 'rgba(212,160,23,0.1)' }}>
                        {TIPS.map(q => (
                            <button key={q.t} onClick={() => send(q.m)} disabled={loading}
                                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full border transition-all flex-shrink-0 font-medium hover:scale-105 active:scale-95"
                                style={{ borderColor: GOLD.chipBorder, color: GOLD.chipColor, background: GOLD.chipBg }}>
                                {q.e} {q.t}
                            </button>
                        ))}
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 h-64">
                        {!msgs.length && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl max-float" style={{ background: GOLD.primary }}>
                                    <RobotIcon size={36} />
                                </div>
                                <div>
                                    <p className="font-bold text-white/90 text-sm">Oi! Sou a Max 👋</p>
                                    <p className="text-[11px] mt-1 leading-relaxed max-w-[200px]" style={{ color: GOLD.muted }}>
                                        Tenho acesso ao sistema e sei de marketing. Me pergunte qualquer coisa!
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {["Resumo do dia", "Quem sumiu há 30 dias?", "Ideia de post"].map(ex => (
                                        <button key={ex} onClick={() => send(ex)}
                                            className="text-[11px] px-2.5 py-1 rounded-full border transition-colors"
                                            style={{ borderColor: GOLD.chipBorder, color: GOLD.chipColor }}>
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {msgs.map(m => (
                            <div key={m.id} className={cn("flex gap-2", m.role === 'user' ? "justify-end" : "justify-start items-end")}>
                                {m.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: GOLD.primary }}>
                                        <RobotIcon size={16} />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1 max-w-[82%]">
                                    {m.tools && m.tools.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {[...new Set(m.tools)].map((t, i) => (
                                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                                                    style={{ background: GOLD.toolBadge, color: GOLD.toolColor }}>
                                                    {TOOL_LABEL[t] ?? t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                        m.role === 'user' ? "text-white rounded-br-sm" : "rounded-bl-sm"
                                    )} style={m.role === 'user'
                                        ? { background: GOLD.userBubble }
                                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(212,160,23,0.15)' }
                                    }>
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                        <p className="text-[10px] mt-1 text-right opacity-40">{m.time}</p>
                                    </div>
                                </div>
                                {m.role === 'user' && (
                                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                                        style={{ background: GOLD.primary }}>EU</div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-end gap-2">
                                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: GOLD.primary }}>
                                    <RobotIcon active size={16} />
                                </div>
                                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,160,23,0.15)' }}>
                                    {activeTool
                                        ? <p className="text-[11px]" style={{ color: GOLD.light }}>🔧 {TOOL_LABEL[activeTool] ?? activeTool}...</p>
                                        : <div className="flex gap-1 items-center h-4">{[0, 1, 2].map(i => (
                                            <span key={i} className={cn("w-2 h-2 rounded-full max-dot", i === 1 && "max-dot2", i === 2 && "max-dot3")}
                                                style={{ background: GOLD.accent }} />
                                        ))}</div>
                                    }
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2"
                                style={{ background: 'rgba(239,68,68,0.14)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <span className="flex-1">{error}</span>
                                <button onClick={() => setError(null)} className="underline shrink-0">Fechar</button>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-2.5 border-t" style={{ background: 'rgba(212,160,23,0.04)', borderColor: 'rgba(212,160,23,0.12)' }}>
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                                onKeyDown={onKey} disabled={loading} rows={1}
                                placeholder="Pergunte ou peça algo... (Enter envia)"
                                aria-label="Mensagem para Max"
                                className="flex-1 resize-none text-sm rounded-xl px-3 py-2 focus:outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)',
                                    border: `1px solid rgba(212,160,23,0.25)`, minHeight: '38px', maxHeight: '88px',
                                    scrollbarWidth: 'none',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.75)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)'; }}
                                onInput={e => {
                                    const el = e.currentTarget; el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 88) + 'px';
                                }}
                            />
                            <button onClick={() => send(input)} disabled={loading || !input.trim()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: GOLD.button }}>
                                <Send className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Botão Flutuante Arrastável ── */}
            <div ref={btnRef} style={{ ...btnStyle, touchAction: 'none' }}>
                {/* Ring de pulso inicial */}
                {pulse && !open && (
                    <div className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ animation: 'maxPulse 1.8s ease-out infinite', background: GOLD.pulse }} />
                )}

                <div className="flex flex-col items-center gap-1 select-none">
                    {/* Alça de drag */}
                    <div
                        className="max-grab w-14 flex justify-center py-0.5 cursor-grab rounded-t-xl"
                        style={{ background: 'rgba(212,160,23,0.12)' }}
                        onMouseDown={e => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
                        onTouchStart={e => { onDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
                        title="Arrastar"
                    >
                        <GripVertical className="w-3.5 h-3.5" style={{ color: GOLD.muted }} />
                    </div>

                    {/* Botão principal */}
                    <button
                        onClick={() => { if (!hasMoved.current) setOpen(v => !v); hasMoved.current = false; }}
                        title={open ? "Fechar Max" : "Abrir Max — Assistente IA"}
                        className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200 relative overflow-hidden",
                            !open && "max-float hover:scale-110 active:scale-95"
                        )}
                        style={{
                            background: open ? GOLD.buttonOpen : GOLD.button,
                            boxShadow: `0 8px 28px ${GOLD.glow}, 0 2px 8px rgba(0,0,0,0.5)`,
                        }}>
                        {/* Brilho interno */}
                        <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.28) 0%, transparent 60%)' }} />
                        {open
                            ? <X className="w-6 h-6 text-white relative z-10" />
                            : <RobotIcon active={loading} size={32} />
                        }
                        {loading && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                        )}
                    </button>

                    {/* Label */}
                    {!open && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: GOLD.chipBg, color: GOLD.accent }}>
                            Max IA
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}
