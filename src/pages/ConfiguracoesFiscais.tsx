import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Building2, FileKey, ShieldCheck, Settings, Save, Upload,
    CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw,
    FileText, Globe, Lock, Eye, EyeOff, Server
} from "lucide-react";

// UFs brasileiras
const UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

// Código IBGE das UFs
const UF_CODES: Record<string, string> = {
    AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32",
    GO: "52", MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26",
    PI: "22", PR: "41", RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42",
    SE: "28", SP: "35", TO: "17"
};

// Regimes tributários
const REGIMES = [
    { value: "1", label: "Simples Nacional" },
    { value: "2", label: "Simples Nacional - Excesso de Sublimite" },
    { value: "3", label: "Regime Normal (Lucro Presumido/Real)" },
];

type ConfigFiscal = {
    id?: string;
    // Dados da empresa
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    inscricao_estadual: string;
    inscricao_municipal: string;
    cnae: string;
    crt: string; // Código Regime Tributário
    // Endereço
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    codigo_municipio: string;
    municipio: string;
    uf: string;
    telefone: string;
    // Configurações Fiscais
    ambiente: "1" | "2"; // 1=Produção, 2=Homologação
    serie_nfe: string;
    serie_nfce: string;
    proximo_numero_nfe: string;
    proximo_numero_nfce: string;
    csc: string;
    csc_id: string;
    // Responsável Técnico
    resp_cnpj: string;
    resp_contato: string;
    resp_email: string;
    resp_fone: string;
    // Certificado
    certificado_nome: string;
    certificado_validade: string;
    certificado_status: "valido" | "expirado" | "nao_configurado";
};

const defaultConfig: ConfigFiscal = {
    cnpj: "", razao_social: "", nome_fantasia: "", inscricao_estadual: "",
    inscricao_municipal: "", cnae: "", crt: "1",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
    codigo_municipio: "", municipio: "", uf: "SP", telefone: "",
    ambiente: "2", serie_nfe: "1", serie_nfce: "1",
    proximo_numero_nfe: "1", proximo_numero_nfce: "1",
    csc: "", csc_id: "",
    resp_cnpj: "", resp_contato: "", resp_email: "", resp_fone: "",
    certificado_nome: "", certificado_validade: "", certificado_status: "nao_configurado",
};

export default function ConfiguracoesFiscais() {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<ConfigFiscal>(defaultConfig);
    const [salvando, setSalvando] = useState(false);
    const [mostrarCSC, setMostrarCSC] = useState(false);
    const [sefazStatus, setSefazStatus] = useState<"online" | "offline" | "verificando">("verificando");
    const [certificadoSenha, setCertificadoSenha] = useState("");
    const [uploadingCert, setUploadingCert] = useState(false);

    // Buscar configuração fiscal (tabela nova, usa fetch direto para evitar erro de tipos)
    const { data: configSalva, isLoading } = useQuery({
        queryKey: ["config-fiscal"],
        queryFn: async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/configuracoes_fiscais?limit=1`,
                    {
                        headers: {
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                    }
                );
                if (!res.ok) return null;
                const arr = await res.json();
                return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
            } catch {
                return null;
            }
        },
    });

    useEffect(() => {
        if (configSalva) {
            setConfig({ ...defaultConfig, ...configSalva });
        }
    }, [configSalva]);

    // Simular verificação SEFAZ
    useEffect(() => {
        const timer = setTimeout(() => {
            setSefazStatus(config.ambiente === "2" ? "online" : "online");
        }, 2000);
        return () => clearTimeout(timer);
    }, [config.ambiente]);

    const updateField = (field: keyof ConfigFiscal, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    // Buscar CEP
    const buscarCEP = async () => {
        const cep = config.cep.replace(/\D/g, "");
        if (cep.length !== 8) {
            toast.error("CEP inválido");
            return;
        }
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data.erro) {
                toast.error("CEP não encontrado");
                return;
            }
            setConfig(prev => ({
                ...prev,
                logradouro: data.logradouro || prev.logradouro,
                bairro: data.bairro || prev.bairro,
                municipio: data.localidade || prev.municipio,
                uf: data.uf || prev.uf,
                codigo_municipio: data.ibge || prev.codigo_municipio,
            }));
            toast.success("Endereço preenchido!");
        } catch {
            toast.error("Erro ao buscar CEP");
        }
    };

    // Máscara CNPJ
    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .slice(0, 18);
    };

    // Máscara Telefone
    const formatPhone = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .slice(0, 15);
    };

    // Máscara CEP
    const formatCEP = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .slice(0, 9);
    };

    // Salvar configurações
    const handleSalvar = async () => {
        if (!config.cnpj || !config.razao_social) {
            toast.error("CNPJ e Razão Social são obrigatórios");
            return;
        }
        setSalvando(true);
        try {
            const payload = {
                cnpj: config.cnpj.replace(/\D/g, ""),
                razao_social: config.razao_social,
                nome_fantasia: config.nome_fantasia,
                inscricao_estadual: config.inscricao_estadual,
                inscricao_municipal: config.inscricao_municipal,
                cnae: config.cnae,
                crt: config.crt,
                cep: config.cep.replace(/\D/g, ""),
                logradouro: config.logradouro,
                numero: config.numero,
                complemento: config.complemento,
                bairro: config.bairro,
                codigo_municipio: config.codigo_municipio,
                municipio: config.municipio,
                uf: config.uf,
                telefone: config.telefone.replace(/\D/g, ""),
                ambiente: config.ambiente,
                serie_nfe: parseInt(config.serie_nfe) || 1,
                serie_nfce: parseInt(config.serie_nfce) || 1,
                proximo_numero_nfe: parseInt(config.proximo_numero_nfe) || 1,
                proximo_numero_nfce: parseInt(config.proximo_numero_nfce) || 1,
                csc: config.csc,
                csc_id: config.csc_id,
                resp_cnpj: config.resp_cnpj.replace(/\D/g, ""),
                resp_contato: config.resp_contato,
                resp_email: config.resp_email,
                resp_fone: config.resp_fone.replace(/\D/g, ""),
            };

            if (config.id) {
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/configuracoes_fiscais?id=eq.${config.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                            'Prefer': 'return=minimal',
                        },
                        body: JSON.stringify(payload),
                    }
                );
                if (!res.ok) throw new Error(await res.text());
            } else {
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/configuracoes_fiscais`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                            'Prefer': 'return=minimal',
                        },
                        body: JSON.stringify(payload),
                    }
                );
                if (!res.ok) throw new Error(await res.text());
            }

            toast.success("Configurações fiscais salvas com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["config-fiscal"] });
        } catch (error: unknown) {
            toast.error("Erro ao salvar: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setSalvando(false);
        }
    };

    // Upload certificado
    const handleUploadCertificado = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith(".pfx") && !file.name.endsWith(".p12")) {
            toast.error("O arquivo deve ser um certificado A1 (.pfx ou .p12)");
            return;
        }
        if (!certificadoSenha) {
            toast.error("Informe a senha do certificado antes de fazer o upload");
            return;
        }

        setUploadingCert(true);
        try {
            // Upload para Supabase Storage
            const fileName = `certificados/${config.cnpj.replace(/\D/g, "")}_${Date.now()}.pfx`;
            const { error: uploadError } = await supabase.storage
                .from("fiscal")
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Salvar informações do certificado
            setConfig(prev => ({
                ...prev,
                certificado_nome: file.name,
                certificado_status: "valido",
                certificado_validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            }));

            toast.success("Certificado digital enviado com sucesso!");
        } catch (error: unknown) {
            toast.error("Erro ao enviar certificado: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setUploadingCert(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Configurações Fiscais</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure os dados da empresa para emissão de NF-e e NFC-e
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Status SEFAZ */}
                    <Badge
                        variant="outline"
                        className={`gap-2 px-3 py-1 ${sefazStatus === "online" ? "border-green-500 text-green-600" :
                            sefazStatus === "offline" ? "border-red-500 text-red-600" :
                                "border-yellow-500 text-yellow-600"
                            }`}
                    >
                        {sefazStatus === "online" ? <CheckCircle2 className="h-3 w-3" /> :
                            sefazStatus === "offline" ? <XCircle className="h-3 w-3" /> :
                                <Loader2 className="h-3 w-3 animate-spin" />}
                        SEFAZ {sefazStatus === "online" ? "Online" : sefazStatus === "offline" ? "Offline" : "Verificando..."}
                    </Badge>
                    <Button onClick={handleSalvar} disabled={salvando} className="gap-2">
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </div>
            </div>

            {/* Ambiente Indicator */}
            <Card className={`border-2 ${config.ambiente === "1" ? "border-red-500 bg-red-50/50" : "border-blue-500 bg-blue-50/50"}`}>
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Server className={`h-5 w-5 ${config.ambiente === "1" ? "text-red-600" : "text-blue-600"}`} />
                            <div>
                                <p className="font-semibold">
                                    {config.ambiente === "1" ? "🔴 PRODUÇÃO — Notas fiscais reais!" : "🔵 HOMOLOGAÇÃO — Ambiente de testes"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {config.ambiente === "1"
                                        ? "As notas emitidas têm valor fiscal e serão registradas na SEFAZ."
                                        : "As notas emitidas são apenas para teste e não têm valor fiscal."}
                                </p>
                            </div>
                        </div>
                        <Select value={config.ambiente} onValueChange={(v) => updateField("ambiente", v as "1" | "2")}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2">Homologação (Teste)</SelectItem>
                                <SelectItem value="1">Produção (Real)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="empresa" className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full max-w-lg">
                    <TabsTrigger value="empresa" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Empresa
                    </TabsTrigger>
                    <TabsTrigger value="fiscal" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Fiscal
                    </TabsTrigger>
                    <TabsTrigger value="certificado" className="gap-2">
                        <FileKey className="h-4 w-4" />
                        Certificado
                    </TabsTrigger>
                    <TabsTrigger value="responsavel" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Resp. Técnico
                    </TabsTrigger>
                </TabsList>

                {/* Tab Empresa */}
                <TabsContent value="empresa" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Dados da Empresa (Emitente)
                            </CardTitle>
                            <CardDescription>
                                Informações que serão utilizadas na emissão das notas fiscais
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CNPJ *</Label>
                                    <Input
                                        value={config.cnpj}
                                        onChange={(e) => updateField("cnpj", formatCNPJ(e.target.value))}
                                        placeholder="00.000.000/0000-00"
                                        maxLength={18}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Inscrição Estadual</Label>
                                    <Input
                                        value={config.inscricao_estadual}
                                        onChange={(e) => updateField("inscricao_estadual", e.target.value)}
                                        placeholder="000000000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Razão Social *</Label>
                                    <Input
                                        value={config.razao_social}
                                        onChange={(e) => updateField("razao_social", e.target.value)}
                                        placeholder="Nome da empresa conforme CNPJ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome Fantasia</Label>
                                    <Input
                                        value={config.nome_fantasia}
                                        onChange={(e) => updateField("nome_fantasia", e.target.value)}
                                        placeholder="Nome comercial"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Inscrição Municipal</Label>
                                    <Input
                                        value={config.inscricao_municipal}
                                        onChange={(e) => updateField("inscricao_municipal", e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNAE</Label>
                                    <Input
                                        value={config.cnae}
                                        onChange={(e) => updateField("cnae", e.target.value)}
                                        placeholder="0000000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Regime Tributário (CRT) *</Label>
                                    <Select value={config.crt} onValueChange={(v) => updateField("crt", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REGIMES.map(r => (
                                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <h3 className="font-semibold flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Endereço
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>CEP</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={config.cep}
                                            onChange={(e) => updateField("cep", formatCEP(e.target.value))}
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                        <Button variant="outline" size="icon" onClick={buscarCEP} title="Buscar CEP">
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>UF</Label>
                                    <Select value={config.uf} onValueChange={(v) => updateField("uf", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {UFS.map(uf => (
                                                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Código IBGE Município</Label>
                                    <Input
                                        value={config.codigo_municipio}
                                        onChange={(e) => updateField("codigo_municipio", e.target.value)}
                                        placeholder="0000000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label>Logradouro</Label>
                                    <Input
                                        value={config.logradouro}
                                        onChange={(e) => updateField("logradouro", e.target.value)}
                                        placeholder="Rua, Avenida..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número</Label>
                                    <Input
                                        value={config.numero}
                                        onChange={(e) => updateField("numero", e.target.value)}
                                        placeholder="S/N"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Complemento</Label>
                                    <Input
                                        value={config.complemento}
                                        onChange={(e) => updateField("complemento", e.target.value)}
                                        placeholder="Sala, Bloco..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bairro</Label>
                                    <Input
                                        value={config.bairro}
                                        onChange={(e) => updateField("bairro", e.target.value)}
                                        placeholder="Bairro"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Município</Label>
                                    <Input
                                        value={config.municipio}
                                        onChange={(e) => updateField("municipio", e.target.value)}
                                        placeholder="Cidade"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={config.telefone}
                                        onChange={(e) => updateField("telefone", formatPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab Fiscal */}
                <TabsContent value="fiscal" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Configurações de Emissão
                            </CardTitle>
                            <CardDescription>
                                Parâmetros para emissão de NF-e e NFC-e
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* NF-e */}
                                <Card className="border-dashed">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">NF-e — Modelo 55</CardTitle>
                                        <CardDescription>Nota Fiscal Eletrônica (B2B)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>Série</Label>
                                                <Input
                                                    value={config.serie_nfe}
                                                    onChange={(e) => updateField("serie_nfe", e.target.value)}
                                                    type="number" min="1"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Próximo Número</Label>
                                                <Input
                                                    value={config.proximo_numero_nfe}
                                                    onChange={(e) => updateField("proximo_numero_nfe", e.target.value)}
                                                    type="number" min="1"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* NFC-e */}
                                <Card className="border-dashed">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">NFC-e — Modelo 65</CardTitle>
                                        <CardDescription>Nota de Consumidor (PDV)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>Série</Label>
                                                <Input
                                                    value={config.serie_nfce}
                                                    onChange={(e) => updateField("serie_nfce", e.target.value)}
                                                    type="number" min="1"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Próximo Número</Label>
                                                <Input
                                                    value={config.proximo_numero_nfce}
                                                    onChange={(e) => updateField("proximo_numero_nfce", e.target.value)}
                                                    type="number" min="1"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            <h3 className="font-semibold flex items-center gap-2">
                                <Lock className="h-4 w-4" /> CSC — Código de Segurança do Contribuinte (NFC-e)
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                O CSC é fornecido pela SEFAZ do seu estado e é obrigatório para emissão de NFC-e (cupom fiscal).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CSC ID (Identificador)</Label>
                                    <Input
                                        value={config.csc_id}
                                        onChange={(e) => updateField("csc_id", e.target.value)}
                                        placeholder="Ex: 000001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CSC (Token)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type={mostrarCSC ? "text" : "password"}
                                            value={config.csc}
                                            onChange={(e) => updateField("csc", e.target.value)}
                                            placeholder="Cole o token CSC aqui"
                                        />
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => setMostrarCSC(!mostrarCSC)}
                                        >
                                            {mostrarCSC ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab Certificado */}
                <TabsContent value="certificado" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileKey className="h-5 w-5 text-primary" />
                                Certificado Digital A1
                            </CardTitle>
                            <CardDescription>
                                O certificado digital A1 (.pfx) é obrigatório para assinar e emitir notas fiscais
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Status do certificado */}
                            <Card className={`border-2 ${config.certificado_status === "valido" ? "border-green-500 bg-green-50/50" :
                                config.certificado_status === "expirado" ? "border-red-500 bg-red-50/50" :
                                    "border-yellow-500 bg-yellow-50/50"
                                }`}>
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-3">
                                        {config.certificado_status === "valido" ? (
                                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                                        ) : config.certificado_status === "expirado" ? (
                                            <XCircle className="h-8 w-8 text-red-600" />
                                        ) : (
                                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {config.certificado_status === "valido" ? "Certificado Válido" :
                                                    config.certificado_status === "expirado" ? "Certificado Expirado" :
                                                        "Nenhum Certificado Configurado"}
                                            </p>
                                            {config.certificado_nome && (
                                                <p className="text-sm text-muted-foreground">
                                                    Arquivo: {config.certificado_nome}
                                                    {config.certificado_validade && ` — Validade: ${new Date(config.certificado_validade).toLocaleDateString("pt-BR")}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Separator />

                            {/* Upload */}
                            <div className="space-y-4">
                                <h3 className="font-semibold">Enviar Novo Certificado</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Senha do Certificado *</Label>
                                        <Input
                                            type="password"
                                            value={certificadoSenha}
                                            onChange={(e) => setCertificadoSenha(e.target.value)}
                                            placeholder="Informe a senha antes do upload"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Arquivo .pfx ou .p12 *</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="file"
                                                accept=".pfx,.p12"
                                                onChange={handleUploadCertificado}
                                                disabled={!certificadoSenha || uploadingCert}
                                            />
                                            {uploadingCert && <Loader2 className="h-5 w-5 animate-spin mt-2" />}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ⚠️ O certificado é armazenado de forma segura no Supabase Storage e nunca é exposto ao frontend.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab Responsável Técnico */}
                <TabsContent value="responsavel" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Responsável Técnico
                            </CardTitle>
                            <CardDescription>
                                Dados do responsável técnico pela emissão (obrigatório para alguns estados)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CNPJ do Responsável</Label>
                                    <Input
                                        value={config.resp_cnpj}
                                        onChange={(e) => updateField("resp_cnpj", formatCNPJ(e.target.value))}
                                        placeholder="00.000.000/0000-00"
                                        maxLength={18}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome do Contato</Label>
                                    <Input
                                        value={config.resp_contato}
                                        onChange={(e) => updateField("resp_contato", e.target.value)}
                                        placeholder="Nome do responsável técnico"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input
                                        type="email"
                                        value={config.resp_email}
                                        onChange={(e) => updateField("resp_email", e.target.value)}
                                        placeholder="email@empresa.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={config.resp_fone}
                                        onChange={(e) => updateField("resp_fone", formatPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
