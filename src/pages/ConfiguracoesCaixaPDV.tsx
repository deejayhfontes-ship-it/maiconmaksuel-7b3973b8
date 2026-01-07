import { useState } from "react";
import { ArrowLeft, CreditCard, Printer, Tablet, Camera, Settings, DollarSign, QrCode, Clock, Eye, Users, Fingerprint, Save, Plus, Trash2, CheckCircle2, AlertCircle, Monitor, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import WebcamConfig from "@/components/configuracoes/WebcamConfig";

// Configurações Caixa
const ConfiguracoesCaixaContent = () => {
  const [configs, setConfigs] = useState({
    exigirAbertura: true,
    permitirSangria: true,
    permitirSuprimento: true,
    valorMinimoGaveta: "100",
    valorMaximoGaveta: "500",
    exigirSenhaFechamento: true,
    permitirCaixaNegativo: false,
    calcularTrocoAutomatico: true,
    exigirConferencia: true,
    permitirDesconto: true,
    limiteDesconto: "15",
    exigirAprovacaoDesconto: true,
    permitirCancelamento: true,
    exigirMotivoCancelamento: true,
    imprimirCupomAutomatico: true,
    enviarEmailRecibo: false,
  });

  const handleSave = () => {
    localStorage.setItem('caixa_config', JSON.stringify(configs));
    toast.success('Configurações do caixa salvas!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Configurações do Caixa
          </CardTitle>
          <CardDescription>
            Defina as regras de operação do caixa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Abertura e Fechamento */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Abertura e Fechamento</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir abertura de caixa</Label>
                  <p className="text-xs text-muted-foreground">
                    Requer abrir o caixa antes de registrar vendas
                  </p>
                </div>
                <Switch
                  checked={configs.exigirAbertura}
                  onCheckedChange={(v) => setConfigs({ ...configs, exigirAbertura: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir conferência no fechamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Obriga conferir valores antes de fechar o caixa
                  </p>
                </div>
                <Switch
                  checked={configs.exigirConferencia}
                  onCheckedChange={(v) => setConfigs({ ...configs, exigirConferencia: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir senha no fechamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Requer senha de administrador para fechar
                  </p>
                </div>
                <Switch
                  checked={configs.exigirSenhaFechamento}
                  onCheckedChange={(v) => setConfigs({ ...configs, exigirSenhaFechamento: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Gaveta */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Gaveta de Dinheiro</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor Mínimo em Gaveta (R$)</Label>
                <Input
                  type="number"
                  value={configs.valorMinimoGaveta}
                  onChange={(e) => setConfigs({ ...configs, valorMinimoGaveta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Máximo em Gaveta (R$)</Label>
                <Input
                  type="number"
                  value={configs.valorMaximoGaveta}
                  onChange={(e) => setConfigs({ ...configs, valorMaximoGaveta: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir sangria</Label>
                  <p className="text-xs text-muted-foreground">
                    Retirada de dinheiro do caixa
                  </p>
                </div>
                <Switch
                  checked={configs.permitirSangria}
                  onCheckedChange={(v) => setConfigs({ ...configs, permitirSangria: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir suprimento</Label>
                  <p className="text-xs text-muted-foreground">
                    Entrada de dinheiro no caixa
                  </p>
                </div>
                <Switch
                  checked={configs.permitirSuprimento}
                  onCheckedChange={(v) => setConfigs({ ...configs, permitirSuprimento: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir caixa negativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite saldo negativo na gaveta
                  </p>
                </div>
                <Switch
                  checked={configs.permitirCaixaNegativo}
                  onCheckedChange={(v) => setConfigs({ ...configs, permitirCaixaNegativo: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Descontos */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Descontos e Cancelamentos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir desconto</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilita desconto nas vendas
                  </p>
                </div>
                <Switch
                  checked={configs.permitirDesconto}
                  onCheckedChange={(v) => setConfigs({ ...configs, permitirDesconto: v })}
                />
              </div>
              {configs.permitirDesconto && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Limite de Desconto (%)</Label>
                    <Input
                      type="number"
                      value={configs.limiteDesconto}
                      onChange={(e) => setConfigs({ ...configs, limiteDesconto: e.target.value })}
                      max="100"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={configs.exigirAprovacaoDesconto}
                      onCheckedChange={(v) => setConfigs({ ...configs, exigirAprovacaoDesconto: v })}
                    />
                    <Label>Exigir aprovação</Label>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir cancelamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite cancelar vendas finalizadas
                  </p>
                </div>
                <Switch
                  checked={configs.permitirCancelamento}
                  onCheckedChange={(v) => setConfigs({ ...configs, permitirCancelamento: v })}
                />
              </div>
              {configs.permitirCancelamento && (
                <div className="flex items-center gap-2 ml-4">
                  <Switch
                    checked={configs.exigirMotivoCancelamento}
                    onCheckedChange={(v) => setConfigs({ ...configs, exigirMotivoCancelamento: v })}
                  />
                  <Label>Exigir motivo do cancelamento</Label>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Automações */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Automações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Calcular troco automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibe troco ao informar valor recebido
                  </p>
                </div>
                <Switch
                  checked={configs.calcularTrocoAutomatico}
                  onCheckedChange={(v) => setConfigs({ ...configs, calcularTrocoAutomatico: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Imprimir cupom automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Imprime ao finalizar a venda
                  </p>
                </div>
                <Switch
                  checked={configs.imprimirCupomAutomatico}
                  onCheckedChange={(v) => setConfigs({ ...configs, imprimirCupomAutomatico: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enviar recibo por email</Label>
                  <p className="text-xs text-muted-foreground">
                    Envia comprovante para o cliente
                  </p>
                </div>
                <Switch
                  checked={configs.enviarEmailRecibo}
                  onCheckedChange={(v) => setConfigs({ ...configs, enviarEmailRecibo: v })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Impressora/Cupom
const ImpressoraCupomContent = () => {
  const [configs, setConfigs] = useState({
    impressoraModelo: "thermal80",
    larguraPapel: "80",
    imprimirLogo: true,
    imprimirEndereco: true,
    imprimirTelefone: true,
    imprimirCpfCnpj: false,
    imprimirObservacoes: true,
    imprimirParcelas: true,
    imprimirCodigo: true,
    mensagemCabecalho: "Obrigado pela preferência!",
    mensagemRodape: "Volte sempre!",
    colunasPorLinha: "48",
    margemEsquerda: "0",
    espacamentoLinhas: "normal",
    cortarPapelAuto: true,
    abrirGavetaAuto: true,
    testeAtivo: false,
  });

  const handleSave = () => {
    localStorage.setItem('impressora_config', JSON.stringify(configs));
    toast.success('Configurações de impressão salvas!');
  };

  const handleTesteImpressao = () => {
    setConfigs({ ...configs, testeAtivo: true });
    toast.info('Enviando teste de impressão...');
    setTimeout(() => {
      setConfigs({ ...configs, testeAtivo: false });
      toast.success('Teste de impressão enviado!');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Configuração de Impressora
          </CardTitle>
          <CardDescription>
            Configure a impressora térmica e o layout do cupom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Impressora */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Impressora</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modelo da Impressora</Label>
                <Select value={configs.impressoraModelo} onValueChange={(v) => setConfigs({ ...configs, impressoraModelo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal58">Térmica 58mm</SelectItem>
                    <SelectItem value="thermal80">Térmica 80mm</SelectItem>
                    <SelectItem value="epson">Epson TM-T20</SelectItem>
                    <SelectItem value="bematech">Bematech MP-4200</SelectItem>
                    <SelectItem value="elgin">Elgin i9</SelectItem>
                    <SelectItem value="generica">Genérica USB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Largura do Papel (mm)</Label>
                <Select value={configs.larguraPapel} onValueChange={(v) => setConfigs({ ...configs, larguraPapel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Colunas por Linha</Label>
                <Input
                  type="number"
                  value={configs.colunasPorLinha}
                  onChange={(e) => setConfigs({ ...configs, colunasPorLinha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Espaçamento entre Linhas</Label>
                <Select value={configs.espacamentoLinhas} onValueChange={(v) => setConfigs({ ...configs, espacamentoLinhas: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compacto">Compacto</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="espaçado">Espaçado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Automações Impressora */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Automações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cortar papel automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Corta o papel ao final da impressão
                  </p>
                </div>
                <Switch
                  checked={configs.cortarPapelAuto}
                  onCheckedChange={(v) => setConfigs({ ...configs, cortarPapelAuto: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Abrir gaveta automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Abre a gaveta ao receber pagamento em dinheiro
                  </p>
                </div>
                <Switch
                  checked={configs.abrirGavetaAuto}
                  onCheckedChange={(v) => setConfigs({ ...configs, abrirGavetaAuto: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Conteúdo do Cupom */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Conteúdo do Cupom</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label>Imprimir logo</Label>
                  <Switch
                    checked={configs.imprimirLogo}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirLogo: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Imprimir endereço</Label>
                  <Switch
                    checked={configs.imprimirEndereco}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirEndereco: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Imprimir telefone</Label>
                  <Switch
                    checked={configs.imprimirTelefone}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirTelefone: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Imprimir CPF/CNPJ cliente</Label>
                  <Switch
                    checked={configs.imprimirCpfCnpj}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirCpfCnpj: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Imprimir observações</Label>
                  <Switch
                    checked={configs.imprimirObservacoes}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirObservacoes: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Imprimir parcelas</Label>
                  <Switch
                    checked={configs.imprimirParcelas}
                    onCheckedChange={(v) => setConfigs({ ...configs, imprimirParcelas: v })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Cabeçalho</Label>
                <Textarea
                  value={configs.mensagemCabecalho}
                  onChange={(e) => setConfigs({ ...configs, mensagemCabecalho: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Rodapé</Label>
                <Textarea
                  value={configs.mensagemRodape}
                  onChange={(e) => setConfigs({ ...configs, mensagemRodape: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
            <Button variant="outline" onClick={handleTesteImpressao} disabled={configs.testeAtivo}>
              <Printer className="h-4 w-4 mr-2" />
              {configs.testeAtivo ? 'Imprimindo...' : 'Teste de Impressão'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Tablet Monitor (Ponto e Visualização Cliente)
const TabletMonitorContent = () => {
  const [configs, setConfigs] = useState({
    // Tela do Cliente
    habilitarTelaCliente: true,
    mostrarLogoTela: true,
    mostrarValorTotal: true,
    mostrarItens: true,
    mostrarFormaPagamento: true,
    mostrarQrCodePix: true,
    pixChave: "",
    pixNomeRecebedor: "",
    pixCidade: "",
    corFundoTela: "#1a1a2e",
    corTextoTela: "#ffffff",
    corDestaqueTela: "#e94560",
    mensagemBoasVindas: "Bem-vindo(a)!",
    mensagemAguardando: "Aguardando atendimento...",
    mensagemFinalizada: "Obrigado pela preferência!",
    tempoExibicaoFinalizada: "5",
    
    // Ponto Eletrônico
    habilitarPonto: true,
    permitirPontoTablet: true,
    tipoRegistroPonto: "foto",
    exigirFotoEntrada: true,
    exigirFotoSaida: true,
    toleranciaMinutos: "15",
    bloquearForaHorario: false,
    notificarAtraso: true,
    
    // Segurança
    senhaAdminTablet: "",
    bloquearAposTempo: true,
    tempoBloquear: "5",
    permitirApenasRede: false,
    redePermitida: "",
  });

  const handleSave = () => {
    localStorage.setItem('tablet_config', JSON.stringify(configs));
    toast.success('Configurações do tablet salvas!');
  };

  const handleAbrirTelaCliente = () => {
    // Abre em nova aba para simular tela externa
    window.open('/tablet/cliente', '_blank', 'fullscreen=yes');
    toast.info('Abrindo tela do cliente em nova janela');
  };

  const handleAbrirTelaPonto = () => {
    window.open('/ponto', '_blank');
    toast.info('Abrindo tela de ponto eletrônico');
  };

  return (
    <div className="space-y-6">
      {/* Informações */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Tablet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Sobre o Tablet/Monitor Adicional</h3>
              <p className="text-sm text-muted-foreground">
                Configure uma tela adicional (tablet ou monitor) para duas funções:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <strong>Espelho do Cliente:</strong> Exibe o total da comanda, itens e formas de pagamento (PIX, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  <strong>Ponto Eletrônico:</strong> Funcionários podem registrar entrada/saída
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tela do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Espelho do Cliente
          </CardTitle>
          <CardDescription>
            Tela para o cliente visualizar o total e forma de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar tela do cliente</Label>
              <p className="text-xs text-muted-foreground">
                Ativa a exibição para o cliente no tablet
              </p>
            </div>
            <Switch
              checked={configs.habilitarTelaCliente}
              onCheckedChange={(v) => setConfigs({ ...configs, habilitarTelaCliente: v })}
            />
          </div>

          {configs.habilitarTelaCliente && (
            <>
              <Separator />
              
              {/* Exibição */}
              <div>
                <h3 className="text-sm font-semibold mb-4">O que exibir</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <Label>Logo do salão</Label>
                    <Switch
                      checked={configs.mostrarLogoTela}
                      onCheckedChange={(v) => setConfigs({ ...configs, mostrarLogoTela: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Valor total</Label>
                    <Switch
                      checked={configs.mostrarValorTotal}
                      onCheckedChange={(v) => setConfigs({ ...configs, mostrarValorTotal: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Lista de itens</Label>
                    <Switch
                      checked={configs.mostrarItens}
                      onCheckedChange={(v) => setConfigs({ ...configs, mostrarItens: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Forma de pagamento</Label>
                    <Switch
                      checked={configs.mostrarFormaPagamento}
                      onCheckedChange={(v) => setConfigs({ ...configs, mostrarFormaPagamento: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* PIX */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Configuração do PIX
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label>Mostrar QR Code do PIX</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibe o QR Code para pagamento via PIX
                    </p>
                  </div>
                  <Switch
                    checked={configs.mostrarQrCodePix}
                    onCheckedChange={(v) => setConfigs({ ...configs, mostrarQrCodePix: v })}
                  />
                </div>
                {configs.mostrarQrCodePix && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <Input
                        placeholder="CPF, CNPJ, Email ou Telefone"
                        value={configs.pixChave}
                        onChange={(e) => setConfigs({ ...configs, pixChave: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Recebedor</Label>
                      <Input
                        placeholder="Nome completo ou razão social"
                        value={configs.pixNomeRecebedor}
                        onChange={(e) => setConfigs({ ...configs, pixNomeRecebedor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        placeholder="Cidade do estabelecimento"
                        value={configs.pixCidade}
                        onChange={(e) => setConfigs({ ...configs, pixCidade: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Personalização Visual */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Personalização Visual</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={configs.corFundoTela}
                        onChange={(e) => setConfigs({ ...configs, corFundoTela: e.target.value })}
                        className="w-14 h-10 p-1"
                      />
                      <Input
                        value={configs.corFundoTela}
                        onChange={(e) => setConfigs({ ...configs, corFundoTela: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={configs.corTextoTela}
                        onChange={(e) => setConfigs({ ...configs, corTextoTela: e.target.value })}
                        className="w-14 h-10 p-1"
                      />
                      <Input
                        value={configs.corTextoTela}
                        onChange={(e) => setConfigs({ ...configs, corTextoTela: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={configs.corDestaqueTela}
                        onChange={(e) => setConfigs({ ...configs, corDestaqueTela: e.target.value })}
                        className="w-14 h-10 p-1"
                      />
                      <Input
                        value={configs.corDestaqueTela}
                        onChange={(e) => setConfigs({ ...configs, corDestaqueTela: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Mensagens */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Mensagens</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Mensagem de Boas-vindas</Label>
                    <Input
                      value={configs.mensagemBoasVindas}
                      onChange={(e) => setConfigs({ ...configs, mensagemBoasVindas: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem Aguardando</Label>
                    <Input
                      value={configs.mensagemAguardando}
                      onChange={(e) => setConfigs({ ...configs, mensagemAguardando: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Mensagem ao Finalizar</Label>
                      <Input
                        value={configs.mensagemFinalizada}
                        onChange={(e) => setConfigs({ ...configs, mensagemFinalizada: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo de Exibição (segundos)</Label>
                      <Input
                        type="number"
                        value={configs.tempoExibicaoFinalizada}
                        onChange={(e) => setConfigs({ ...configs, tempoExibicaoFinalizada: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="outline" onClick={handleAbrirTelaCliente}>
                <Monitor className="h-4 w-4 mr-2" />
                Abrir Tela do Cliente (Preview)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Ponto Eletrônico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Ponto Eletrônico
          </CardTitle>
          <CardDescription>
            Configure o registro de ponto pelo tablet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar ponto no tablet</Label>
              <p className="text-xs text-muted-foreground">
                Permite registro de ponto pelo tablet
              </p>
            </div>
            <Switch
              checked={configs.habilitarPonto}
              onCheckedChange={(v) => setConfigs({ ...configs, habilitarPonto: v })}
            />
          </div>

          {configs.habilitarPonto && (
            <>
              <Separator />
              
              <div>
                <h3 className="text-sm font-semibold mb-4">Tipo de Registro</h3>
                <Select value={configs.tipoRegistroPonto} onValueChange={(v) => setConfigs({ ...configs, tipoRegistroPonto: v })}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Simples (apenas clique)</SelectItem>
                    <SelectItem value="senha">Com senha</SelectItem>
                    <SelectItem value="foto">Com foto</SelectItem>
                    <SelectItem value="senha_foto">Senha + Foto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(configs.tipoRegistroPonto === 'foto' || configs.tipoRegistroPonto === 'senha_foto') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Exigir foto na entrada</Label>
                    <Switch
                      checked={configs.exigirFotoEntrada}
                      onCheckedChange={(v) => setConfigs({ ...configs, exigirFotoEntrada: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Exigir foto na saída</Label>
                    <Switch
                      checked={configs.exigirFotoSaida}
                      onCheckedChange={(v) => setConfigs({ ...configs, exigirFotoSaida: v })}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-4">Regras</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tolerância de atraso (minutos)</Label>
                      <Input
                        type="number"
                        value={configs.toleranciaMinutos}
                        onChange={(e) => setConfigs({ ...configs, toleranciaMinutos: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Bloquear fora do horário</Label>
                      <p className="text-xs text-muted-foreground">
                        Impede registro fora do expediente
                      </p>
                    </div>
                    <Switch
                      checked={configs.bloquearForaHorario}
                      onCheckedChange={(v) => setConfigs({ ...configs, bloquearForaHorario: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificar atrasos</Label>
                      <p className="text-xs text-muted-foreground">
                        Envia notificação quando funcionário atrasa
                      </p>
                    </div>
                    <Switch
                      checked={configs.notificarAtraso}
                      onCheckedChange={(v) => setConfigs({ ...configs, notificarAtraso: v })}
                    />
                  </div>
                </div>
              </div>

              <Button variant="outline" onClick={handleAbrirTelaPonto}>
                <Fingerprint className="h-4 w-4 mr-2" />
                Abrir Tela de Ponto (Preview)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Segurança do Tablet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Senha de administrador do tablet</Label>
            <Input
              type="password"
              placeholder="Senha para acessar configurações no tablet"
              value={configs.senhaAdminTablet}
              onChange={(e) => setConfigs({ ...configs, senhaAdminTablet: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Bloquear após inatividade</Label>
              <p className="text-xs text-muted-foreground">
                Retorna à tela inicial após tempo ocioso
              </p>
            </div>
            <Switch
              checked={configs.bloquearAposTempo}
              onCheckedChange={(v) => setConfigs({ ...configs, bloquearAposTempo: v })}
            />
          </div>
          {configs.bloquearAposTempo && (
            <div className="space-y-2 ml-4">
              <Label>Tempo de inatividade (minutos)</Label>
              <Input
                type="number"
                value={configs.tempoBloquear}
                onChange={(e) => setConfigs({ ...configs, tempoBloquear: e.target.value })}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} size="lg">
        <Save className="h-4 w-4 mr-2" />
        Salvar Todas as Configurações
      </Button>
    </div>
  );
};

export default function ConfiguracoesCaixaPDV() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("caixa");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Configurações Caixa/PDV
          </h1>
          <p className="text-muted-foreground">
            Configure o caixa, impressora, webcam e tablet
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="caixa" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Caixa</span>
          </TabsTrigger>
          <TabsTrigger value="webcam" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Webcam</span>
          </TabsTrigger>
          <TabsTrigger value="impressora" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Impressora</span>
          </TabsTrigger>
          <TabsTrigger value="tablet" className="flex items-center gap-2">
            <Tablet className="h-4 w-4" />
            <span className="hidden sm:inline">Tablet</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="caixa">
            <ConfiguracoesCaixaContent />
          </TabsContent>
          <TabsContent value="webcam">
            <WebcamConfig />
          </TabsContent>
          <TabsContent value="impressora">
            <ImpressoraCupomContent />
          </TabsContent>
          <TabsContent value="tablet">
            <TabletMonitorContent />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
