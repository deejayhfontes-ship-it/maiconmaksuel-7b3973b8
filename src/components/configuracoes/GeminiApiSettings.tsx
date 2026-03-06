import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const SB_URL = "https://nzngwbknezmfthbyfjmx.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bmd3YmtuZXptZnRoYnlmam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODU5MDIsImV4cCI6MjA4NDc2MTkwMn0.S_2Hr2KEqrEj1nHIot1fBr2U1ihojl_f-owxDhf-iAk";

const HEADERS = {
    apikey: SB_ANON,
    Authorization: `Bearer ${SB_ANON}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
};

interface ApiKeyRow {
    id: string;
    service: string;
    api_key: string;
    is_active: boolean;
    created_at: string;
}

export default function GeminiApiSettings() {
    const [rows, setRows] = useState<ApiKeyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editing, setEditing] = useState<Record<string, string>>({});
    const [visible, setVisible] = useState<Record<string, boolean>>({});
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail'>>({});

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${SB_URL}/rest/v1/api_keys?service=eq.gemini&order=created_at.asc`,
                { headers: HEADERS }
            );
            const data: ApiKeyRow[] = await res.json();
            setRows(data);
            // Inicializa editing com os valores atuais
            const init: Record<string, string> = {};
            data.forEach(r => { init[r.id] = r.api_key; });
            setEditing(init);
        } catch {
            toast.error("Erro ao carregar chaves");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchKeys(); }, []);

    const mask = (key: string) => {
        if (key.length < 10) return key;
        return key.slice(0, 8) + "••••••••••••••••••" + key.slice(-4);
    };

    const handleSave = async (row: ApiKeyRow) => {
        const newKey = editing[row.id]?.trim();
        if (!newKey) { toast.error("Chave não pode ser vazia"); return; }
        setSaving(row.id);
        try {
            const res = await fetch(
                `${SB_URL}/rest/v1/api_keys?id=eq.${row.id}`,
                {
                    method: "PATCH",
                    headers: HEADERS,
                    body: JSON.stringify({ api_key: newKey, is_active: true }),
                }
            );
            if (!res.ok) throw new Error(await res.text());
            toast.success("Chave Gemini atualizada com sucesso!");
            await fetchKeys();
        } catch (e) {
            toast.error("Erro ao salvar: " + (e instanceof Error ? e.message : "desconhecido"));
        } finally {
            setSaving(null);
        }
    };

    const handleAdd = async () => {
        const key = prompt("Cole sua nova chave Gemini API:");
        if (!key?.trim()) return;
        setSaving("new");
        try {
            // Desativa todas antigas e insere nova
            await fetch(`${SB_URL}/rest/v1/api_keys?service=eq.gemini`, {
                method: "PATCH", headers: HEADERS, body: JSON.stringify({ is_active: false })
            });
            const res = await fetch(`${SB_URL}/rest/v1/api_keys`, {
                method: "POST", headers: HEADERS,
                body: JSON.stringify({ service: "gemini", api_key: key.trim(), is_active: true }),
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success("Nova chave adicionada com sucesso!");
            await fetchKeys();
        } catch (e) {
            toast.error("Erro: " + (e instanceof Error ? e.message : "desconhecido"));
        } finally {
            setSaving(null);
        }
    };

    const handleTest = async (row: ApiKeyRow) => {
        setTesting(row.id);
        setTestResult(prev => { const n = { ...prev }; delete n[row.id]; return n; });
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${row.api_key}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "Responda apenas: OK" }] }] }),
                }
            );
            if (res.ok) {
                setTestResult(prev => ({ ...prev, [row.id]: 'ok' }));
                toast.success("✅ Chave funcionando!");
            } else {
                const err = await res.json();
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
        } catch (e) {
            setTestResult(prev => ({ ...prev, [row.id]: 'fail' }));
            toast.error("❌ Chave inválida: " + (e instanceof Error ? e.message : "erro"));
        } finally {
            setTesting(null);
        }
    };

    const handleToggleActive = async (row: ApiKeyRow) => {
        try {
            // Desativa todas e ativa a escolhida
            await fetch(`${SB_URL}/rest/v1/api_keys?service=eq.gemini`, {
                method: "PATCH", headers: HEADERS, body: JSON.stringify({ is_active: false })
            });
            await fetch(`${SB_URL}/rest/v1/api_keys?id=eq.${row.id}`, {
                method: "PATCH", headers: HEADERS, body: JSON.stringify({ is_active: true })
            });
            toast.success("Chave ativa alterada");
            await fetchKeys();
        } catch {
            toast.error("Erro ao alterar chave ativa");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="ml-2 text-muted-foreground">Carregando chaves...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">APIs de Inteligência Artificial</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gerencie as chaves Gemini usadas pelo <strong>Gerador de Artes</strong> e pelo <strong>Agente Max</strong>.
                        Quando a cota acabar, troque a chave aqui.
                    </p>
                </div>
            </div>

            {/* Info box */}
            <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                <div className="flex gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Key className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Como obter uma chave gratuita:</p>
                        <p className="mt-0.5 text-muted-foreground">
                            Acesse{" "}
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                                className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800">
                                aistudio.google.com/apikey
                            </a>{" "}
                            → crie um projeto → copie a chave → cole aqui.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Lista de chaves */}
            <div className="space-y-3">
                {rows.map((row, idx) => (
                    <Card key={row.id} className={`p-4 border-2 transition-colors ${row.is_active ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.is_active ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                                {row.is_active ? '⚡ ATIVA' : `Chave ${idx + 1}`}
                            </span>
                            {testResult[row.id] === 'ok' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>}
                            {testResult[row.id] === 'fail' && <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Inválida</span>}
                            <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(row.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>

                        {/* Campo da chave */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 relative">
                                <Input
                                    type={visible[row.id] ? "text" : "password"}
                                    value={editing[row.id] ?? row.api_key}
                                    onChange={e => setEditing(prev => ({ ...prev, [row.id]: e.target.value }))}
                                    className="pr-10 font-mono text-sm"
                                    placeholder="AIza..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible(v => ({ ...v, [row.id]: !v[row.id] }))}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {visible[row.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                size="sm" variant="default"
                                onClick={() => handleSave(row)}
                                disabled={saving === row.id || editing[row.id] === row.api_key}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {saving === row.id
                                    ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</>
                                    : <><Save className="w-3.5 h-3.5 mr-1.5" />Salvar</>
                                }
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => handleTest(row)} disabled={testing === row.id}>
                                {testing === row.id
                                    ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testando...</>
                                    : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Testar</>
                                }
                            </Button>

                            {!row.is_active && (
                                <Button size="sm" variant="outline" onClick={() => handleToggleActive(row)}>
                                    Ativar esta chave
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}

                {rows.length === 0 && (
                    <Card className="p-8 text-center border-dashed">
                        <Key className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma chave Gemini cadastrada.</p>
                    </Card>
                )}
            </div>

            {/* Adicionar nova chave */}
            <Button variant="outline" onClick={handleAdd} disabled={saving === "new"} className="w-full border-dashed">
                {saving === "new"
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Adicionando...</>
                    : <><Key className="w-4 h-4 mr-2" />Adicionar nova chave Gemini</>
                }
            </Button>

            <p className="text-xs text-muted-foreground">
                💡 A chave <strong>ativa</strong> é usada automaticamente pelo Gerador de Artes e pelo Agente Max (chat). Ao adicionar uma nova chave, as anteriores ficam inativas.
            </p>
        </div>
    );
}
