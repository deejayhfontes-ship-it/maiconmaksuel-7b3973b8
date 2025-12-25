import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, parseISO, differenceInHours, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Clock, 
  Scissors, 
  User, 
  AlertTriangle,
  MapPin,
  Phone,
  CalendarPlus,
  Map,
  RefreshCw,
  Smartphone
} from "lucide-react";
import logoMaicon from "@/assets/logo-maicon.jpg";

interface AgendamentoData {
  id: string;
  data_hora: string;
  cliente: {
    nome: string;
  };
  servico: {
    nome: string;
  };
  profissional: {
    nome: string;
  };
}

interface ConfirmacaoData {
  id: string;
  status: string;
  valor_taxa: number;
  confirmado_em: string | null;
  cancelado_em: string | null;
}

type PageStatus = "loading" | "found" | "confirmed" | "cancelled" | "cancelling" | "expired" | "not_found" | "already_used" | "passed";

export default function ConfirmarAgendamento() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");
  
  const [status, setStatus] = useState<PageStatus>("loading");
  const [agendamento, setAgendamento] = useState<AgendamentoData | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoData | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [querReagendar, setQuerReagendar] = useState("nao");
  const [processing, setProcessing] = useState(false);
  const [taxaConfig, setTaxaConfig] = useState<{ valor_taxa: number; prazo_minimo_cancelamento_horas: number } | null>(null);
  const [horasRestantes, setHorasRestantes] = useState(0);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      // Buscar confirmação pelo token
      const { data: confirmacaoData, error: confirmacaoError } = await supabase
        .from("confirmacoes_agendamento")
        .select(`
          id,
          status,
          valor_taxa,
          confirmado_em,
          cancelado_em,
          agendamento_id
        `)
        .eq("token_confirmacao", token)
        .single();

      if (confirmacaoError || !confirmacaoData) {
        setStatus("not_found");
        return;
      }

      setConfirmacao(confirmacaoData);

      // Verificar se já foi usado
      if (confirmacaoData.status === "confirmado") {
        setStatus("already_used");
        return;
      }
      if (confirmacaoData.status === "cancelado") {
        setStatus("already_used");
        return;
      }

      // Buscar dados do agendamento
      const { data: agendamentoData, error: agendamentoError } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          cliente:clientes(nome),
          servico:servicos(nome),
          profissional:profissionais(nome)
        `)
        .eq("id", confirmacaoData.agendamento_id)
        .single();

      if (agendamentoError || !agendamentoData) {
        setStatus("not_found");
        return;
      }

      // Verificar se o agendamento já passou
      const dataAgendamento = parseISO(agendamentoData.data_hora);
      if (isBefore(dataAgendamento, new Date())) {
        setStatus("passed");
        return;
      }

      // Calcular horas restantes
      const horas = differenceInHours(dataAgendamento, new Date());
      setHorasRestantes(horas);

      // Buscar configuração de taxa
      const { data: taxaData } = await supabase
        .from("configuracoes_taxa_falta")
        .select("valor_taxa, prazo_minimo_cancelamento_horas")
        .single();

      if (taxaData) {
        setTaxaConfig(taxaData);
      }

      setAgendamento({
        id: agendamentoData.id,
        data_hora: agendamentoData.data_hora,
        cliente: agendamentoData.cliente as { nome: string },
        servico: agendamentoData.servico as { nome: string },
        profissional: agendamentoData.profissional as { nome: string },
      });

      // Se veio com action=cancel, ir direto para tela de cancelamento
      if (action === "cancel") {
        setStatus("cancelling");
      } else {
        setStatus("found");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setStatus("not_found");
    }
  };

  const handleConfirmar = async () => {
    if (!confirmacao || !agendamento) return;
    setProcessing(true);

    try {
      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agendamento")
        .update({
          status: "confirmado",
          confirmado_em: new Date().toISOString(),
          ip_confirmacao: "client-ip", // Em produção, pegar do servidor
        })
        .eq("id", confirmacao.id);

      // Atualizar status do agendamento
      await supabase
        .from("agendamentos")
        .update({ status: "confirmado" })
        .eq("id", agendamento.id);

      setStatus("confirmed");
    } catch (error) {
      console.error("Erro ao confirmar:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirmacao || !agendamento) return;
    setProcessing(true);

    try {
      const aplicarTaxa = taxaConfig && horasRestantes < taxaConfig.prazo_minimo_cancelamento_horas;

      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agendamento")
        .update({
          status: "cancelado",
          cancelado_em: new Date().toISOString(),
          observacao_cancelamento: motivoCancelamento,
          taxa_aplicada: aplicarTaxa,
          valor_taxa: aplicarTaxa ? taxaConfig?.valor_taxa : 0,
          ip_confirmacao: "client-ip",
        })
        .eq("id", confirmacao.id);

      // Atualizar status do agendamento
      await supabase
        .from("agendamentos")
        .update({ status: "cancelado" })
        .eq("id", agendamento.id);

      setStatus("cancelled");
    } catch (error) {
      console.error("Erro ao cancelar:", error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDataHora = (dataHora: string) => {
    const data = parseISO(dataHora);
    return {
      data: format(data, "EEEE, dd 'de' MMMM", { locale: ptBR }),
      hora: format(data, "HH:mm"),
    };
  };

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not Found
  if (status === "not_found" || status === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Link Inválido ou Expirado</h1>
            <p className="text-muted-foreground">
              Este link de confirmação não é válido ou já expirou.
            </p>
            <p className="text-sm text-muted-foreground">
              Se precisar de ajuda, entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already Used
  if (status === "already_used") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Link Já Utilizado</h1>
            <p className="text-muted-foreground">
              Este link de confirmação já foi utilizado anteriormente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passed
  if (status === "passed") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Agendamento Passado</h1>
            <p className="text-muted-foreground">
              O horário deste agendamento já passou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmed Success
  if (status === "confirmed" && agendamento) {
    const { data, hora } = formatDataHora(agendamento.data_hora);
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
                Agendamento Confirmado!
              </h1>
              <p className="text-muted-foreground">
                Obrigado, {agendamento.cliente.nome.split(" ")[0]}! 😊
              </p>
            </div>

            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="capitalize">{data} às {hora}</span>
              </div>
              <div className="flex items-center gap-3">
                <Scissors className="h-5 w-5 text-primary" />
                <span>{agendamento.servico.nome}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span>Com {agendamento.profissional.nome}</span>
              </div>
            </div>

            <p className="text-center text-muted-foreground">
              Te esperamos! 💖
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a href="#">
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Adicionar ao Calendário
                </a>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href="#">
                  <Map className="h-4 w-4 mr-2" />
                  Ver no Maps
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cancelled Success
  if (status === "cancelled" && agendamento) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Agendamento Cancelado</h1>
            <p className="text-muted-foreground">
              Seu agendamento foi cancelado conforme solicitado.
            </p>

            {taxaConfig && horasRestantes < taxaConfig.prazo_minimo_cancelamento_horas && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Taxa de Cancelamento
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Como o cancelamento foi realizado com menos de {taxaConfig.prazo_minimo_cancelamento_horas} horas de antecedência, 
                      uma taxa de R$ {taxaConfig.valor_taxa.toFixed(2)} será aplicada no próximo agendamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Caso queira reagendar, entre em contato conosco.
            </p>

            <Button variant="outline" className="w-full" asChild>
              <a href="tel:+5511999998888">
                <Phone className="h-4 w-4 mr-2" />
                Entrar em Contato
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cancelling (form)
  if (status === "cancelling" && agendamento) {
    const { data, hora } = formatDataHora(agendamento.data_hora);
    const dentroDoLimite = taxaConfig ? horasRestantes >= taxaConfig.prazo_minimo_cancelamento_horas : true;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-destructive">Cancelar Agendamento</h1>
              <p className="text-muted-foreground">Tem certeza que deseja cancelar?</p>
            </div>

            <div className="space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="capitalize">{data} às {hora}</span>
              </div>
              <div className="flex items-center gap-3">
                <Scissors className="h-5 w-5 text-muted-foreground" />
                <span>{agendamento.servico.nome}</span>
              </div>
            </div>

            {taxaConfig && (
              <div className={`rounded-lg p-4 ${dentroDoLimite ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"} border`}>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${dentroDoLimite ? "text-green-600" : "text-amber-600"}`} />
                  Política de Cancelamento
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• Cancelamento até {taxaConfig.prazo_minimo_cancelamento_horas}h antes: <strong>SEM TAXA</strong></li>
                  <li>• Menos de {taxaConfig.prazo_minimo_cancelamento_horas}h: <strong>Taxa de R$ {taxaConfig.valor_taxa.toFixed(2)}</strong></li>
                </ul>
                <div className={`mt-3 font-medium ${dentroDoLimite ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                  {dentroDoLimite ? (
                    <>Tempo restante: {horasRestantes}h ✅ (Sem taxa)</>
                  ) : (
                    <>Tempo restante: {horasRestantes}h ⚠️ (Taxa será aplicada)</>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo do cancelamento (opcional)</Label>
              <Textarea
                placeholder="Conte-nos o motivo..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Deseja reagendar agora?</Label>
              <RadioGroup value={querReagendar} onValueChange={setQuerReagendar}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="sim" />
                  <Label htmlFor="sim">Sim, quero reagendar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="nao" />
                  <Label htmlFor="nao">Não, apenas cancelar</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStatus("found")}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleCancelar}
                disabled={processing}
              >
                {processing ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Found (main view)
  if (status === "found" && agendamento) {
    const { data, hora } = formatDataHora(agendamento.data_hora);

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          {/* Header com logo */}
          <div className="bg-primary/5 p-6 text-center border-b">
            <img 
              src={logoMaicon} 
              alt="Logo" 
              className="h-16 w-16 rounded-full mx-auto mb-3 object-cover"
            />
            <h1 className="text-lg font-bold text-foreground">MAICON MAKSUEL CONCEPT</h1>
            <p className="text-sm text-muted-foreground">Gestão de Salão</p>
          </div>

          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <p className="text-lg">
                Olá, <span className="font-semibold">{agendamento.cliente.nome.split(" ")[0]}</span>! 😊
              </p>
              <p className="text-muted-foreground">Confirme seu agendamento:</p>
            </div>

            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="capitalize font-medium">{data}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">{hora}</span>
              </div>
              <div className="flex items-center gap-3">
                <Scissors className="h-5 w-5 text-primary" />
                <span>{agendamento.servico.nome}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span>Com {agendamento.profissional.nome}</span>
              </div>
            </div>

            <div className="text-center">
              <p className="font-medium mb-4">O que deseja fazer?</p>
              
              <div className="space-y-3">
                <Button 
                  className="w-full h-14 text-base bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmar}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {processing ? "Confirmando..." : "Confirmar Presença"}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full h-14 text-base border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setStatus("cancelling")}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Preciso Cancelar
                </Button>
              </div>
            </div>

            {taxaConfig && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>Importante:</strong> Cancelamentos com menos de {taxaConfig.prazo_minimo_cancelamento_horas} horas de antecedência ou faltas sem aviso estão sujeitos à cobrança de taxa de R$ {taxaConfig.valor_taxa.toFixed(2)} no próximo agendamento.
                  </p>
                </div>
              </div>
            )}

            <div className="border-t pt-4 text-center text-sm text-muted-foreground space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                <span>(11) 99999-8888</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Rua Exemplo, 123 - Alfenas/MG</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
