import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, CheckCircle2, AlertTriangle, Loader2, Mail, 
  MessageSquare, Building2, User, XCircle, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FecharComandaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: {
    id: string;
    numero_comanda: number;
    valor_final: number;
    cliente_id: string | null;
    status: string;
  } | null;
  onSuccess?: () => void;
}

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  celular: string;
  sempre_emitir_nf: boolean;
};

type ConfigFiscal = {
  id: string;
  auto_emitir_cnpj: boolean;
  auto_emitir_cpf: boolean;
  auto_emitir_flag: boolean;
  valor_sugerir_emissao: number;
  sugerir_emissao_marcado: boolean;
  comportamento_emissao: string;
  auto_enviar_email: boolean;
  auto_enviar_sms: boolean;
  empresa_razao_social: string;
  cnpj: string;
  api_token: string;
  certificado_digital_path: string;
  numero_proximo_nfce: number;
  serie_nfce: number;
  numero_proximo_nfe: number;
  serie_nfe: number;
};

type EmissaoStatus = "idle" | "validating" | "emitting" | "success" | "error";

export function FecharComandaModal({ open, onOpenChange, atendimento, onSuccess }: FecharComandaModalProps) {
  const queryClient = useQueryClient();
  const [opcaoNota, setOpcaoNota] = useState<"nao" | "nfce">("nao");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [enviarSms, setEnviarSms] = useState(false);
  const [aguardarAutorizacao, setAguardarAutorizacao] = useState(true);
  const [emissaoStatus, setEmissaoStatus] = useState<EmissaoStatus>("idle");
  const [erroEmissao, setErroEmissao] = useState("");
  const [notaEmitida, setNotaEmitida] = useState<{ numero: number; chave: string } | null>(null);

  // Query para buscar cliente
  const { data: cliente } = useQuery({
    queryKey: ["cliente-atendimento", atendimento?.cliente_id],
    queryFn: async () => {
      if (!atendimento?.cliente_id) return null;
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cpf, email, celular, sempre_emitir_nf")
        .eq("id", atendimento.cliente_id)
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!atendimento?.cliente_id,
  });

  // Query para buscar configurações fiscais
  const { data: configFiscal } = useQuery({
    queryKey: ["config-fiscal-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_fiscal")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as ConfigFiscal | null;
    },
  });

  // Detectar tipo de cliente
  const isCnpj = cliente?.cpf && cliente.cpf.replace(/\D/g, "").length === 14;
  const isSempreEmitir = cliente?.sempre_emitir_nf || false;
  const isEmissaoAutomatica = (isCnpj && configFiscal?.auto_emitir_cnpj) || (isSempreEmitir && configFiscal?.auto_emitir_flag);
  const valorAlto = atendimento && configFiscal && atendimento.valor_final >= configFiscal.valor_sugerir_emissao;

  // Inicializar valores ao abrir modal
  useEffect(() => {
    if (open && cliente) {
      setCpfCnpj(cliente.cpf || "");
      setEmail(cliente.email || "");
      setEnviarEmail(configFiscal?.auto_enviar_email || true);
      setEnviarSms(configFiscal?.auto_enviar_sms || false);
      setAguardarAutorizacao(configFiscal?.comportamento_emissao === "aguardar");
      
      // Se emissão automática, já marca para emitir
      if (isEmissaoAutomatica) {
        setOpcaoNota("nfce");
      } else if (valorAlto && configFiscal?.sugerir_emissao_marcado) {
        setOpcaoNota("nfce");
      } else {
        setOpcaoNota("nao");
      }
      
      setEmissaoStatus("idle");
      setErroEmissao("");
      setNotaEmitida(null);
    }
  }, [open, cliente, configFiscal, isEmissaoAutomatica, valorAlto]);

  // Validar CPF/CNPJ
  const validarCpfCnpj = (valor: string): boolean => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length === 11) return validarCPF(numeros);
    if (numeros.length === 14) return validarCNPJ(numeros);
    return false;
  };

  const validarCPF = (cpf: string): boolean => {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf[10]);
  };

  const validarCNPJ = (cnpj: string): boolean => {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    tamanho++;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  };

  // Formatar CPF/CNPJ
  const formatarCpfCnpj = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      return numeros
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
        .slice(0, 18);
    }
  };

  // Função para enviar dados para o tablet
  const enviarParaTablet = async (status: "fechando" | "finalizado", formaPagamento?: string) => {
    if (!atendimento) return;

    try {
      // Buscar itens do atendimento
      const { data: servicos } = await supabase
        .from("atendimento_servicos")
        .select(`
          id,
          quantidade,
          preco_unitario,
          subtotal,
          servico:servicos(nome),
          profissional:profissionais(nome)
        `)
        .eq("atendimento_id", atendimento.id);

      const { data: produtos } = await supabase
        .from("atendimento_produtos")
        .select(`
          id,
          quantidade,
          preco_unitario,
          subtotal,
          produto:produtos(nome)
        `)
        .eq("atendimento_id", atendimento.id);

      // Calcular valores
      const itensServicos = (servicos || []).map((s: any) => ({
        id: s.id,
        nome: s.servico?.nome || "Serviço",
        quantidade: s.quantidade,
        valorUnitario: s.preco_unitario,
        profissional: s.profissional?.nome
      }));

      const itensProdutos = (produtos || []).map((p: any) => ({
        id: p.id,
        nome: p.produto?.nome || "Produto",
        quantidade: p.quantidade,
        valorUnitario: p.preco_unitario
      }));

      const subtotal = [...itensServicos, ...itensProdutos].reduce(
        (acc, item) => acc + item.valorUnitario * item.quantidade,
        0
      );

      const comandaData = {
        numero: atendimento.numero_comanda,
        cliente: cliente?.nome || "Consumidor",
        status,
        itens: [...itensServicos, ...itensProdutos],
        subtotal,
        desconto: subtotal - atendimento.valor_final,
        total: atendimento.valor_final,
        formaPagamento
      };

      // Enviar via broadcast para o tablet (canal tablet-comanda)
      const channel = supabase.channel('tablet-comanda');
      await channel.send({
        type: 'broadcast',
        event: 'comanda-update',
        payload: comandaData
      });
      supabase.removeChannel(channel);

      // Enviar via broadcast para o kiosk (canal kiosk-comanda) - redundância
      const kioskChannel = supabase.channel('kiosk-comanda');
      if (status === 'fechando') {
        await kioskChannel.send({
          type: 'broadcast',
          event: 'comanda-fechada',
          payload: comandaData
        });
      } else {
        await kioskChannel.send({
          type: 'broadcast',
          event: 'pagamento-confirmado',
          payload: {}
        });
      }
      supabase.removeChannel(kioskChannel);
      
      if (import.meta.env.DEV) console.log('ADMIN_BROADCAST_SENT', { status, channels: ['tablet-comanda', 'kiosk-comanda'] });
    } catch (error) {
      console.error("Erro ao enviar dados para tablet:", error);
    }
  };

  // Mutation para fechar comanda
  const fecharComandaMutation = useMutation({
    mutationFn: async (emitirNota: boolean) => {
      if (!atendimento) throw new Error("Atendimento não encontrado");
      console.log('[FecharComanda] finalize_start', { id: atendimento.id, emitirNota });

      let notaFiscalId: string | null = null;

      // Só processar nota fiscal se o usuário ESCOLHEU emitir
      if (emitirNota) {
        setEmissaoStatus("validating");

        // Validações de configuração fiscal
        if (!configFiscal?.empresa_razao_social || !configFiscal?.cnpj) {
          throw new Error("Configure os dados fiscais da empresa em Configurações > Fiscal");
        }
        if (!configFiscal?.api_token) {
          throw new Error("Configure o token da API fiscal em Configurações > Fiscal");
        }
        if (cpfCnpj && !validarCpfCnpj(cpfCnpj)) {
          throw new Error("CPF/CNPJ inválido");
        }
        if (enviarEmail && !email) {
          throw new Error("Email não cadastrado - desmarque 'Enviar por email' ou preencha o email");
        }

        setEmissaoStatus("emitting");

        // Criar nota fiscal
        const tipoNota = isCnpj ? "nfe" : "nfce";
        const serie = tipoNota === "nfe" ? configFiscal.serie_nfe : configFiscal.serie_nfce;
        const numero = tipoNota === "nfe" ? configFiscal.numero_proximo_nfe : configFiscal.numero_proximo_nfce;

        const { data: nota, error: erroNota } = await supabase
          .from("notas_fiscais")
          .insert([{
            tipo: tipoNota,
            numero,
            serie,
            status: aguardarAutorizacao ? "processando" : "rascunho",
            cliente_id: atendimento.cliente_id,
            cliente_nome: cliente?.nome,
            cliente_cpf_cnpj: cpfCnpj || null,
            atendimento_id: atendimento.id,
            valor_total: atendimento.valor_final,
            valor_servicos: atendimento.valor_final,
            valor_produtos: 0,
            valor_desconto: 0,
          }])
          .select()
          .single();

        if (erroNota) throw erroNota;
        notaFiscalId = nota.id;

        // Simular emissão (em produção, chamaria API real)
        if (aguardarAutorizacao) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Atualizar nota como autorizada
          const chaveAcesso = "3525 " + Math.random().toString().slice(2, 6) + " " + 
                             Math.random().toString().slice(2, 6) + " " +
                             Math.random().toString().slice(2, 6) + " " +
                             Math.random().toString().slice(2, 6) + " " +
                             Math.random().toString().slice(2, 6) + " " +
                             Math.random().toString().slice(2, 6);

          await supabase
            .from("notas_fiscais")
            .update({
              status: "autorizada",
              chave_acesso: chaveAcesso,
              protocolo: "135" + Date.now().toString().slice(-12),
              data_autorizacao: new Date().toISOString(),
            })
            .eq("id", nota.id);

          setNotaEmitida({ numero, chave: chaveAcesso });
        }

        // Atualizar próximo número
        await supabase
          .from("configuracoes_fiscal")
          .update({
            [tipoNota === "nfe" ? "numero_proximo_nfe" : "numero_proximo_nfce"]: numero + 1,
          })
          .eq("id", configFiscal.id);
      }

      // Fechar atendimento (transação principal — só aqui a comanda fecha)
      const { error } = await supabase
        .from("atendimentos")
        .update({
          status: "fechado",
          nota_fiscal_id: notaFiscalId,
          nota_fiscal_solicitada: emitirNota,
        })
        .eq("id", atendimento.id);

      if (error) throw error;

      // Atualizar última visita do cliente
      if (atendimento.cliente_id) {
        try {
          const { data: clienteData } = await supabase
            .from("clientes")
            .select("total_visitas")
            .eq("id", atendimento.cliente_id)
            .single();
          
          await supabase.from("clientes").update({
            ultima_visita: new Date().toISOString(),
            total_visitas: (clienteData?.total_visitas || 0) + 1,
          }).eq("id", atendimento.cliente_id);
        } catch (e) {
          console.warn('[FecharComanda] Erro ao atualizar visita do cliente:', e);
        }
      }

      console.log('[FecharComanda] finalize_success', { id: atendimento.id });
      return { notaFiscalId, emitirNota };
    },
    onSuccess: async ({ emitirNota }) => {
      setEmissaoStatus("success");
      // Invalidate ALL relevant caches so the entire system updates
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      
      // Enviar para tablet que finalizou
      await enviarParaTablet("finalizado");
      
      if (emitirNota && notaEmitida) {
        toast.success(`Comanda fechada! Nota fiscal #${String(notaEmitida.numero).padStart(6, "0")} emitida`);
      } else if (emitirNota && !aguardarAutorizacao) {
        toast.success("Comanda fechada! Nota será emitida em instantes");
      } else {
        toast.success("Comanda fechada com sucesso!");
      }
      
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, emitirNota ? 1500 : 500);
    },
    onError: (error) => {
      console.error('[FecharComanda] finalize_fail', error);
      setEmissaoStatus("error");
      setErroEmissao(error.message);
    },
  });

  const handleFechar = async () => {
    if (fecharComandaMutation.isPending) {
      console.log('[FecharComanda] blocked: already submitting');
      return;
    }
    console.log('[FecharComanda] confirmed — initiating finalize');
    // Enviar para tablet que está fechando
    await enviarParaTablet("fechando");
    fecharComandaMutation.mutate(opcaoNota === "nfce");
  };

  const handleTentarNovamente = () => {
    setEmissaoStatus("idle");
    setErroEmissao("");
  };

  const handleFecharSemNota = () => {
    setOpcaoNota("nao");
    fecharComandaMutation.mutate(false);
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (!atendimento) return null;

  // Tela de sucesso
  if (emissaoStatus === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold">Comanda Fechada!</h3>
            {notaEmitida && (
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p>Nota fiscal #{String(notaEmitida.numero).padStart(6, "0")} emitida</p>
                <p className="font-mono text-xs">{notaEmitida.chave}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Tela de erro
  if (emissaoStatus === "error") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-destructive">Erro ao emitir nota</h3>
            <p className="mt-2 text-sm text-muted-foreground">{erroEmissao}</p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleTentarNovamente}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button variant="ghost" onClick={handleFecharSemNota}>
                Fechar sem NF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Tela de loading
  if (emissaoStatus === "validating" || emissaoStatus === "emitting") {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium">
              {emissaoStatus === "validating" ? "Validando dados..." : "Emitindo nota fiscal..."}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Aguarde, isso pode levar alguns segundos
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      // Block closing via ESC or outside click while submitting
      if (fecharComandaMutation.isPending) return;
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-lg" onEscapeKeyDown={(e) => {
        if (fecharComandaMutation.isPending) e.preventDefault();
      }} onPointerDownOutside={(e) => {
        if (fecharComandaMutation.isPending) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Fechar Comanda #{String(atendimento.numero_comanda).padStart(3, "0")}</DialogTitle>
          <DialogDescription>
            {isEmissaoAutomatica 
              ? "Nota fiscal será emitida automaticamente" 
              : "Confirme os dados para fechar a comanda"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCnpj ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{cliente?.nome || "Consumidor"}</span>
                </div>
                {isCnpj && <Badge variant="outline">CNPJ</Badge>}
                {isSempreEmitir && !isCnpj && <Badge variant="outline">Sempre NF</Badge>}
              </div>
              {cliente?.cpf && (
                <p className="text-sm text-muted-foreground">{cliente.cpf}</p>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatarValor(atendimento.valor_final)}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Seção Nota Fiscal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">
                {isEmissaoAutomatica ? "Emissão Automática de " + (isCnpj ? "NF-e" : "NFC-e") : "Nota Fiscal"}
              </h4>
            </div>

            {isEmissaoAutomatica ? (
              // Emissão automática
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Nota fiscal será emitida automaticamente</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Email para envio</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enviar_email"
                      checked={enviarEmail}
                      onCheckedChange={(checked) => setEnviarEmail(checked as boolean)}
                    />
                    <Label htmlFor="enviar_email" className="cursor-pointer flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Enviar por email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aguardar_auth"
                      checked={aguardarAutorizacao}
                      onCheckedChange={(checked) => setAguardarAutorizacao(checked as boolean)}
                    />
                    <Label htmlFor="aguardar_auth" className="cursor-pointer text-sm">
                      Aguardar autorização da SEFAZ antes de fechar
                      <span className="block text-xs text-muted-foreground">
                        (demora 10-20 segundos, mas garante emissão)
                      </span>
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              // Perguntar se deseja emitir
              <RadioGroup
                value={opcaoNota}
                onValueChange={(value) => setOpcaoNota(value as "nao" | "nfce")}
                className="space-y-3"
              >
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all",
                  opcaoNota === "nao" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="nao" id="nao" />
                  <Label htmlFor="nao" className="cursor-pointer flex-1">
                    Não emitir nota fiscal
                  </Label>
                </div>

                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all",
                  opcaoNota === "nfce" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="nfce" id="nfce" />
                  <Label htmlFor="nfce" className="cursor-pointer flex-1">
                    <div className="flex items-center justify-between">
                      <span>Emitir NFC-e agora</span>
                      {valorAlto && (
                        <Badge variant="secondary" className="text-xs">Sugerido</Badge>
                      )}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}

            {/* Campos adicionais se emitir NFC-e */}
            {opcaoNota === "nfce" && !isEmissaoAutomatica && (
              <div className="space-y-4 pl-7 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpf_cnpj"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    className={cn(
                      cpfCnpj && !validarCpfCnpj(cpfCnpj) && "border-destructive"
                    )}
                  />
                  {cpfCnpj && !validarCpfCnpj(cpfCnpj) && (
                    <p className="text-xs text-destructive">CPF/CNPJ inválido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_nf">Email para envio</Label>
                  <Input
                    id="email_nf"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enviar_email_nf"
                      checked={enviarEmail}
                      onCheckedChange={(checked) => setEnviarEmail(checked as boolean)}
                    />
                    <Label htmlFor="enviar_email_nf" className="cursor-pointer flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Enviar nota por email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enviar_sms_nf"
                      checked={enviarSms}
                      onCheckedChange={(checked) => setEnviarSms(checked as boolean)}
                    />
                    <Label htmlFor="enviar_sms_nf" className="cursor-pointer flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Enviar nota por SMS
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avisos */}
          {!configFiscal?.api_token && opcaoNota === "nfce" && (
            <div className="rounded-lg border border-warning/50 bg-warning-bg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-text flex-shrink-0" />
                <p className="text-sm text-warning-text">
                  Configure a API fiscal em Configurações para emitir notas
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleFechar}
            disabled={
              fecharComandaMutation.isPending || 
              (opcaoNota === "nfce" && cpfCnpj && !validarCpfCnpj(cpfCnpj)) ||
              (isEmissaoAutomatica && cpfCnpj && !validarCpfCnpj(cpfCnpj))
            }
          >
            {fecharComandaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEmissaoAutomatica || opcaoNota === "nfce" ? "Fechar e Emitir NF" : "Fechar Comanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
