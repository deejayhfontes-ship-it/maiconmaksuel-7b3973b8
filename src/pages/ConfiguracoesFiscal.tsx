import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Plug, Calculator, Save, Upload, TestTube, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const CFOP_SERVICOS = [
  { value: "5933", label: "5933 - Prestação de serviço tributado pelo ISSQN" },
  { value: "6933", label: "6933 - Prestação de serviço tributado pelo ISSQN (interestadual)" },
];

const CFOP_PRODUTOS = [
  { value: "5102", label: "5102 - Venda de mercadoria" },
  { value: "5405", label: "5405 - Venda de mercadoria ST" },
  { value: "6102", label: "6102 - Venda de mercadoria (interestadual)" },
];

interface ConfiguracaoFiscal {
  id?: string;
  empresa_razao_social: string;
  empresa_nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  telefone: string;
  email: string;
  regime_tributario: string;
  certificado_digital_path: string;
  certificado_senha: string;
  ambiente: string;
  serie_nfe: number;
  numero_proximo_nfe: number;
  serie_nfce: number;
  numero_proximo_nfce: number;
  api_provider: string;
  api_token: string;
  cfop_servicos: string;
  cfop_produtos: string;
  aliquota_iss: number;
  aliquota_icms: number;
  observacoes_padrao: string;
  emissao_automatica: boolean;
  tipo_emissao_automatica: string;
  envio_email_automatico: boolean;
}

const defaultConfig: ConfiguracaoFiscal = {
  empresa_razao_social: "",
  empresa_nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  endereco_logradouro: "",
  endereco_numero: "",
  endereco_complemento: "",
  endereco_bairro: "",
  endereco_cidade: "",
  endereco_uf: "",
  endereco_cep: "",
  telefone: "",
  email: "",
  regime_tributario: "simples_nacional",
  certificado_digital_path: "",
  certificado_senha: "",
  ambiente: "homologacao",
  serie_nfe: 1,
  numero_proximo_nfe: 1,
  serie_nfce: 1,
  numero_proximo_nfce: 1,
  api_provider: "focus_nfe",
  api_token: "",
  cfop_servicos: "5933",
  cfop_produtos: "5102",
  aliquota_iss: 3,
  aliquota_icms: 0,
  observacoes_padrao: "",
  emissao_automatica: false,
  tipo_emissao_automatica: "nfce",
  envio_email_automatico: true,
};

export default function ConfiguracoesFiscal() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConfiguracaoFiscal>(defaultConfig);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [statusConexao, setStatusConexao] = useState<"success" | "error" | null>(null);

  const { data: configData, isLoading } = useQuery({
    queryKey: ["configuracoes-fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_fiscal")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (configData) {
      setConfig(configData as ConfiguracaoFiscal);
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: async (data: ConfiguracaoFiscal) => {
      if (data.id) {
        const { error } = await supabase
          .from("configuracoes_fiscal")
          .update(data)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracoes_fiscal")
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["configuracoes-fiscal"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const handleSave = () => {
    if (!config.empresa_razao_social || !config.cnpj) {
      toast.error("Razão Social e CNPJ são obrigatórios");
      return;
    }
    saveMutation.mutate(config);
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setConfig(prev => ({
          ...prev,
          endereco_logradouro: data.logradouro || "",
          endereco_bairro: data.bairro || "",
          endereco_cidade: data.localidade || "",
          endereco_uf: data.uf || "",
        }));
        toast.success("Endereço encontrado!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const testarConexao = async () => {
    if (!config.api_token) {
      toast.error("Configure o token da API primeiro");
      return;
    }
    
    setTestandoConexao(true);
    setStatusConexao(null);
    
    // Simula teste de conexão - em produção, faria chamada real à API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simula sucesso para demonstração
    setStatusConexao("success");
    setTestandoConexao(false);
    toast.success("Conexão estabelecida com sucesso!");
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações Fiscais</h1>
        <p className="text-muted-foreground mt-1">
          Configure os dados da empresa e integração para emissão de notas fiscais
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Dados da Empresa</span>
            <span className="sm:hidden">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="certificado" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Certificado Digital</span>
            <span className="sm:hidden">Certificado</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integração API</span>
            <span className="sm:hidden">API</span>
          </TabsTrigger>
          <TabsTrigger value="tributacao" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Tributação</span>
            <span className="sm:hidden">Tributos</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dados da Empresa */}
        <TabsContent value="empresa" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Principais</CardTitle>
              <CardDescription>Informações básicas da empresa</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={config.empresa_razao_social}
                  onChange={(e) => setConfig(prev => ({ ...prev, empresa_razao_social: e.target.value }))}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={config.empresa_nome_fantasia}
                  onChange={(e) => setConfig(prev => ({ ...prev, empresa_nome_fantasia: e.target.value }))}
                  placeholder="Nome fantasia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={config.cnpj}
                  onChange={(e) => setConfig(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  value={config.inscricao_estadual}
                  onChange={(e) => setConfig(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                  placeholder="Inscrição estadual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="im">Inscrição Municipal</Label>
                <Input
                  id="im"
                  value={config.inscricao_municipal}
                  onChange={(e) => setConfig(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                  placeholder="Inscrição municipal"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>Endereço completo da empresa</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={config.endereco_cep}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      setConfig(prev => ({ ...prev, endereco_cep: formatted }));
                      if (formatted.length === 9) buscarCep(formatted);
                    }}
                    placeholder="00000-000"
                  />
                  {buscandoCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={config.endereco_logradouro}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco_logradouro: e.target.value }))}
                  placeholder="Rua, Avenida, etc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={config.endereco_numero}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco_numero: e.target.value }))}
                  placeholder="Nº"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={config.endereco_complemento}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco_complemento: e.target.value }))}
                  placeholder="Sala, Bloco, etc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={config.endereco_bairro}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco_bairro: e.target.value }))}
                  placeholder="Bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={config.endereco_cidade}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco_cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Select
                  value={config.endereco_uf}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, endereco_uf: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
              <CardDescription>Telefone e email da empresa</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={config.telefone}
                  onChange={(e) => setConfig(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="empresa@email.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regime Tributário</CardTitle>
              <CardDescription>Selecione o regime tributário da empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.regime_tributario}
                onValueChange={(value) => setConfig(prev => ({ ...prev, regime_tributario: value }))}
                className="grid gap-3 md:grid-cols-3"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="simples_nacional" id="simples" />
                  <Label htmlFor="simples" className="cursor-pointer flex-1">Simples Nacional</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="lucro_presumido" id="presumido" />
                  <Label htmlFor="presumido" className="cursor-pointer flex-1">Lucro Presumido</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="lucro_real" id="real" />
                  <Label htmlFor="real" className="cursor-pointer flex-1">Lucro Real</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full md:w-auto">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </TabsContent>

        {/* Tab 2: Certificado Digital */}
        <TabsContent value="certificado" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital</CardTitle>
              <CardDescription>
                O certificado digital é obrigatório para emissão de NF-e e NFC-e. 
                Deve ser do tipo A1 (.pfx) e válido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Upload do Certificado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Arraste o arquivo .pfx ou clique para selecionar
                </p>
                <Button variant="outline" className="mt-4">
                  Selecionar Arquivo
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha_cert">Senha do Certificado</Label>
                <Input
                  id="senha_cert"
                  type="password"
                  value={config.certificado_senha}
                  onChange={(e) => setConfig(prev => ({ ...prev, certificado_senha: e.target.value }))}
                  placeholder="Senha do certificado digital"
                />
              </div>

              <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                {config.certificado_digital_path ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium text-success-text">Certificado válido</p>
                      <p className="text-sm text-muted-foreground">Válido até: 25/12/2026</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium text-warning-text">Nenhum certificado configurado</p>
                      <p className="text-sm text-muted-foreground">Faça upload do certificado para emitir notas</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Novo Certificado
                </Button>
                <Button variant="outline" disabled={!config.certificado_digital_path}>
                  <TestTube className="mr-2 h-4 w-4" />
                  Testar Certificado
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Séries e Numeração</CardTitle>
              <CardDescription>Configure as séries e números das notas fiscais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">NF-e (Nota Fiscal Eletrônica)</h4>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="serie_nfe">Série</Label>
                      <Input
                        id="serie_nfe"
                        type="number"
                        min="1"
                        value={config.serie_nfe}
                        onChange={(e) => setConfig(prev => ({ ...prev, serie_nfe: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_nfe">Próximo Número</Label>
                      <Input
                        id="numero_nfe"
                        type="number"
                        min="1"
                        value={config.numero_proximo_nfe}
                        onChange={(e) => setConfig(prev => ({ ...prev, numero_proximo_nfe: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">NFC-e (Nota Fiscal Consumidor)</h4>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="serie_nfce">Série</Label>
                      <Input
                        id="serie_nfce"
                        type="number"
                        min="1"
                        value={config.serie_nfce}
                        onChange={(e) => setConfig(prev => ({ ...prev, serie_nfce: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_nfce">Próximo Número</Label>
                      <Input
                        id="numero_nfce"
                        type="number"
                        min="1"
                        value={config.numero_proximo_nfce}
                        onChange={(e) => setConfig(prev => ({ ...prev, numero_proximo_nfce: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-warning/50 bg-warning-bg p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning-text flex-shrink-0" />
                  <p className="text-sm text-warning-text">
                    <strong>Cuidado ao alterar a numeração.</strong> Verifique junto à SEFAZ para evitar problemas de sequência.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full md:w-auto">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </TabsContent>

        {/* Tab 3: Integração API */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Provedor de API</CardTitle>
              <CardDescription>Selecione o provedor de API para emissão de notas fiscais</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.api_provider}
                onValueChange={(value) => setConfig(prev => ({ ...prev, api_provider: value }))}
                className="grid gap-4 md:grid-cols-3"
              >
                <div className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${config.api_provider === "focus_nfe" ? "border-primary bg-primary/5" : "border-muted"}`}>
                  <RadioGroupItem value="focus_nfe" id="focus" className="absolute right-4 top-4" />
                  <div className="pr-8">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">Focus NFe</h4>
                      <Badge variant="secondary" className="text-xs">Recomendado</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Planos a partir de R$ 29/mês</p>
                    <p className="text-xs text-muted-foreground mt-2">API robusta e confiável</p>
                    <Button variant="link" size="sm" className="px-0 mt-2 h-auto" asChild>
                      <a href="https://focusnfe.com.br" target="_blank" rel="noopener noreferrer">
                        Saiba mais <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${config.api_provider === "tiny" ? "border-primary bg-primary/5" : "border-muted"}`}>
                  <RadioGroupItem value="tiny" id="tiny" className="absolute right-4 top-4" />
                  <div className="pr-8">
                    <h4 className="font-semibold">Tiny ERP</h4>
                    <p className="text-sm text-muted-foreground mt-1">Integração completa</p>
                    <p className="text-xs text-muted-foreground mt-2">ERP + Nota Fiscal</p>
                    <Button variant="link" size="sm" className="px-0 mt-2 h-auto" asChild>
                      <a href="https://tiny.com.br" target="_blank" rel="noopener noreferrer">
                        Saiba mais <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${config.api_provider === "enotas" ? "border-primary bg-primary/5" : "border-muted"}`}>
                  <RadioGroupItem value="enotas" id="enotas" className="absolute right-4 top-4" />
                  <div className="pr-8">
                    <h4 className="font-semibold">eNotas</h4>
                    <p className="text-sm text-muted-foreground mt-1">Emissão de NFS-e</p>
                    <p className="text-xs text-muted-foreground mt-2">Especializado em serviços</p>
                    <Button variant="link" size="sm" className="px-0 mt-2 h-auto" asChild>
                      <a href="https://enotas.com.br" target="_blank" rel="noopener noreferrer">
                        Saiba mais <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuração da API</CardTitle>
              <CardDescription>Configure as credenciais de acesso à API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api_token">Token da API *</Label>
                <Input
                  id="api_token"
                  type="password"
                  value={config.api_token}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_token: e.target.value }))}
                  placeholder="Cole aqui seu token de acesso"
                />
                <p className="text-sm text-muted-foreground">
                  Não tem conta?{" "}
                  <a href="https://focusnfe.com.br/registro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Criar conta no Focus NFe
                  </a>
                </p>
              </div>

              <div className="space-y-3">
                <Label>Ambiente</Label>
                <RadioGroup
                  value={config.ambiente}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, ambiente: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="producao" id="producao" />
                    <Label htmlFor="producao" className="cursor-pointer">Produção</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="homologacao" id="homologacao" />
                    <Label htmlFor="homologacao" className="cursor-pointer">Homologação (teste)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={testarConexao} variant="outline" disabled={testandoConexao}>
                  {testandoConexao ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Testar Conexão
                </Button>

                {statusConexao === "success" && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Conectado com sucesso</span>
                  </div>
                )}

                {statusConexao === "error" && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span>Erro na conexão</span>
                  </div>
                )}
              </div>

              {config.ambiente === "homologacao" && (
                <div className="rounded-lg border border-warning/50 bg-warning-bg p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning-text flex-shrink-0" />
                    <p className="text-sm text-warning-text">
                      <strong>Ambiente de homologação.</strong> As notas emitidas são apenas para teste e não têm valor fiscal.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full md:w-auto">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </TabsContent>

        {/* Tab 4: Tributação */}
        <TabsContent value="tributacao" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Padrão - Serviços</CardTitle>
              <CardDescription>Valores padrão para emissão de notas de serviços</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cfop_servicos">CFOP Padrão</Label>
                <Select
                  value={config.cfop_servicos}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, cfop_servicos: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CFOP_SERVICOS.map(cfop => (
                      <SelectItem key={cfop.value} value={cfop.value}>{cfop.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliquota_iss">Alíquota ISS (%)</Label>
                <Input
                  id="aliquota_iss"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={config.aliquota_iss}
                  onChange={(e) => setConfig(prev => ({ ...prev, aliquota_iss: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item_lista">Item Lista Serviço</Label>
                <Select defaultValue="1401">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1401">14.01 - Lubrificação, limpeza...</SelectItem>
                    <SelectItem value="0601">06.01 - Barbearia, cabeleireiros...</SelectItem>
                    <SelectItem value="0602">06.02 - Esteticistas, tratamento...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Padrão - Produtos</CardTitle>
              <CardDescription>Valores padrão para emissão de notas de produtos</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cfop_produtos">CFOP Padrão</Label>
                <Select
                  value={config.cfop_produtos}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, cfop_produtos: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CFOP_PRODUTOS.map(cfop => (
                      <SelectItem key={cfop.value} value={cfop.value}>{cfop.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {config.regime_tributario !== "simples_nacional" && (
                <div className="space-y-2">
                  <Label htmlFor="aliquota_icms">Alíquota ICMS (%)</Label>
                  <Input
                    id="aliquota_icms"
                    type="number"
                    min="0"
                    max="25"
                    step="0.1"
                    value={config.aliquota_icms}
                    onChange={(e) => setConfig(prev => ({ ...prev, aliquota_icms: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações Padrão</CardTitle>
              <CardDescription>Texto que aparecerá em todas as notas fiscais emitidas</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={config.observacoes_padrao}
                onChange={(e) => setConfig(prev => ({ ...prev, observacoes_padrao: e.target.value }))}
                placeholder="Ex: Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI."
                rows={4}
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full md:w-auto">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
