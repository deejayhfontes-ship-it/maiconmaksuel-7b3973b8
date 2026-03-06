import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Plus, Trash2, Check, AlertCircle, Info, Star } from "lucide-react";

type AvisoTipo = "aviso" | "lembrete" | "urgente" | "info";

interface Aviso {
    id: string;
    texto: string;
    tipo: AvisoTipo;
    criadoEm: number;
    concluido?: boolean;
}

const STORAGE_KEY = "dashboard_mural_avisos";

const tipoConfig: Record<AvisoTipo, { label: string; color: string; icon: React.ElementType; badge: string }> = {
    aviso: { label: "Aviso", color: "text-amber-600", icon: BellRing, badge: "bg-amber-100 text-amber-700" },
    lembrete: { label: "Lembrete", color: "text-blue-600", icon: Star, badge: "bg-blue-100 text-blue-700" },
    urgente: { label: "Urgente", color: "text-red-600", icon: AlertCircle, badge: "bg-red-100 text-red-700" },
    info: { label: "Info", color: "text-emerald-600", icon: Info, badge: "bg-emerald-100 text-emerald-700" },
};

const MuralAvisos = () => {
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const [novoTexto, setNovoTexto] = useState("");
    const [novoTipo, setNovoTipo] = useState<AvisoTipo>("aviso");
    const [adicionando, setAdicionando] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setAvisos(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const salvar = (lista: Aviso[]) => {
        setAvisos(lista);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch { /* ignore */ }
    };

    const adicionar = () => {
        if (!novoTexto.trim()) return;
        const novo: Aviso = {
            id: Date.now().toString(),
            texto: novoTexto.trim(),
            tipo: novoTipo,
            criadoEm: Date.now(),
        };
        salvar([novo, ...avisos]);
        setNovoTexto("");
        setAdicionando(false);
    };

    const remover = (id: string) => salvar(avisos.filter(a => a.id !== id));
    const toggleConcluir = (id: string) => salvar(avisos.map(a => a.id === id ? { ...a, concluido: !a.concluido } : a));

    const avisosAtivos = avisos.filter(a => !a.concluido);
    const avisosConcluidos = avisos.filter(a => a.concluido);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-amber-500" />
                        Mural de Avisos
                    </CardTitle>
                    {avisosAtivos.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{avisosAtivos.length} pendente(s)</p>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAdicionando(!adicionando)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-amber-50"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden flex flex-col gap-2 pt-0">
                {/* Formulário novo aviso */}
                {adicionando && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                        <textarea
                            value={novoTexto}
                            onChange={e => setNovoTexto(e.target.value)}
                            placeholder="Digite o aviso ou lembrete..."
                            rows={2}
                            autoFocus
                            className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 resize-none"
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) adicionar(); }}
                        />
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 flex-1">
                                {(Object.keys(tipoConfig) as AvisoTipo[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNovoTipo(t)}
                                        className={`text-xs px-2 py-1 rounded-full border transition-all ${novoTipo === t ? `${tipoConfig[t].badge} border-transparent` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        {tipoConfig[t].label}
                                    </button>
                                ))}
                            </div>
                            <Button size="sm" onClick={adicionar} disabled={!novoTexto.trim()} className="h-7 text-xs">
                                Adicionar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lista de avisos */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-0.5">
                    {avisosAtivos.length === 0 && !adicionando && (
                        <div className="text-center py-8 text-muted-foreground">
                            <BellRing className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Nenhum aviso ativo.</p>
                            <p className="text-xs opacity-70">Clique em + para adicionar</p>
                        </div>
                    )}
                    {avisosAtivos.map(aviso => {
                        const cfg = tipoConfig[aviso.tipo];
                        const Icon = cfg.icon;
                        return (
                            <div key={aviso.id} className="flex items-start gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 group">
                                <button onClick={() => toggleConcluir(aviso.id)} className="shrink-0 mt-0.5" title="Marcar como concluído">
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-400 transition-colors flex items-center justify-center" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-700 leading-relaxed">{aviso.texto}</p>
                                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${cfg.badge}`}>
                                        <Icon className={`w-2.5 h-2.5 inline mr-0.5 -mt-0.5`} />
                                        {cfg.label}
                                    </span>
                                </div>
                                <button onClick={() => remover(aviso.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Remover aviso">
                                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 transition-colors" />
                                </button>
                            </div>
                        );
                    })}
                    {/* Concluídos */}
                    {avisosConcluidos.length > 0 && (
                        <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-slate-600">
                                {avisosConcluidos.length} concluído(s)
                            </summary>
                            <div className="space-y-1 mt-1">
                                {avisosConcluidos.map(aviso => (
                                    <div key={aviso.id} className="flex items-start gap-2 p-2 opacity-50 group">
                                        <button onClick={() => toggleConcluir(aviso.id)} className="shrink-0 mt-0.5">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            </div>
                                        </button>
                                        <p className="text-xs text-slate-500 line-through flex-1">{aviso.texto}</p>
                                        <button onClick={() => remover(aviso.id)} className="opacity-0 group-hover:opacity-100 shrink-0">
                                            <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default MuralAvisos;
