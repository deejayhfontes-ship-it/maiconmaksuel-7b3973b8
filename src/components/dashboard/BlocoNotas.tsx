import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookPen, Save, Check } from "lucide-react";

const STORAGE_KEY = "dashboard_bloco_notas";

const BlocoNotas = () => {
    const [texto, setTexto] = useState("");
    const [salvo, setSalvo] = useState(true);
    const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);
    const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Carrega ao montar
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setTexto(parsed.texto || "");
                setUltimoSalvo(parsed.savedAt ? new Date(parsed.savedAt) : null);
            }
        } catch { /* ignore */ }
    }, []);

    // Auto-save com debounce de 1.5s
    const salvar = useCallback((t: string) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ texto: t, savedAt: Date.now() }));
            setUltimoSalvo(new Date());
            setSalvo(true);
        } catch { /* ignore */ }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setTexto(val);
        setSalvo(false);

        if (saveTimer) clearTimeout(saveTimer);
        const t = setTimeout(() => salvar(val), 1500);
        setSaveTimer(t);
    };

    const handleSalvarManual = () => {
        if (saveTimer) clearTimeout(saveTimer);
        salvar(texto);
    };

    const chars = texto.length;
    const linhas = texto.split("\n").length;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <NotebookPen className="w-4 h-4 text-blue-500" />
                        Bloco de Notas
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {ultimoSalvo
                            ? `Salvo ${ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                            : "Não salvo"}
                    </p>
                </div>
                <button
                    onClick={handleSalvarManual}
                    title="Salvar agora"
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${salvo
                            ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                            : "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                        }`}
                >
                    {salvo ? (
                        <><Check className="w-3 h-3" /> Salvo</>
                    ) : (
                        <><Save className="w-3 h-3" /> Salvar</>
                    )}
                </button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-0 gap-2">
                <textarea
                    value={texto}
                    onChange={handleChange}
                    placeholder="Anote aqui o que precisar...&#10;&#10;Dicas: Ctrl+Enter para salvar manualmente&#10;Auto-save a cada 1.5 segundos"
                    className="flex-1 w-full min-h-[220px] text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed text-slate-700 placeholder-slate-300 font-mono"
                    onKeyDown={e => {
                        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSalvarManual(); }
                    }}
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                    <span>{linhas} linha{linhas !== 1 ? "s" : ""}</span>
                    <span>{chars} caractere{chars !== 1 ? "s" : ""}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default BlocoNotas;
