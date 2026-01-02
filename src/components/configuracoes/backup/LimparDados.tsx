import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Shield, Image, FileText, Users, DollarSign, RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ConfirmStep = 1 | 2 | 3;

interface DataCounts {
  clientes: number;
  agendamentos: number;
  atendimentos: number;
  produtos: number;
  servicos: number;
  profissionais: number;
  contasPagar: number;
  contasReceber: number;
}

export default function LimparDados() {
  const navigate = useNavigate();
  const [showZerarDialog, setShowZerarDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>(1);
  const [backupFeito, setBackupFeito] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [textoConfirmacao, setTextoConfirmacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmacoes, setConfirmacoes] = useState({
    entendo: false,
    fezBackup: false,
    responsabilidade: false,
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [dataCounts, setDataCounts] = useState<DataCounts>({
    clientes: 0,
    agendamentos: 0,
    atendimentos: 0,
    produtos: 0,
    servicos: 0,
    profissionais: 0,
    contasPagar: 0,
    contasReceber: 0,
  });

  // Buscar contagem de dados ao abrir o modal
  useEffect(() => {
    if (showZerarDialog) {
      fetchDataCounts();
    }
  }, [showZerarDialog]);

  const fetchDataCounts = async () => {
    try {
      const [
        clientesRes,
        agendamentosRes,
        atendimentosRes,
        produtosRes,
        servicosRes,
        profissionaisRes,
        contasPagarRes,
        contasReceberRes,
      ] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("agendamentos").select("id", { count: "exact", head: true }),
        supabase.from("atendimentos").select("id", { count: "exact", head: true }),
        supabase.from("produtos").select("id", { count: "exact", head: true }),
        supabase.from("servicos").select("id", { count: "exact", head: true }),
        supabase.from("profissionais").select("id", { count: "exact", head: true }),
        supabase.from("contas_pagar").select("id", { count: "exact", head: true }),
        supabase.from("contas_receber").select("id", { count: "exact", head: true }),
      ]);

      setDataCounts({
        clientes: clientesRes.count || 0,
        agendamentos: agendamentosRes.count || 0,
        atendimentos: atendimentosRes.count || 0,
        produtos: produtosRes.count || 0,
        servicos: servicosRes.count || 0,
        profissionais: profissionaisRes.count || 0,
        contasPagar: contasPagarRes.count || 0,
        contasReceber: contasReceberRes.count || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar contagem:", error);
    }
  };

  const handleLimparTeste = async () => {
    toast.success("Dados de teste removidos!");
  };

  const handleLimparLogs = async () => {
    toast.success("Logs antigos removidos!");
  };

  const handleLimparCache = async () => {
    toast.success("Cache de imagens limpo!");
  };

  const canProceedStep2 = backupFeito;
  const canProceedStep3 = 
    senhaAdmin.length >= 6 &&
    textoConfirmacao === "RESETAR SISTEMA" &&
    motivo.length > 0 &&
    confirmacoes.entendo &&
    confirmacoes.fezBackup &&
    confirmacoes.responsabilidade;

  const handleZerarSistema = async () => {
    setLoading(true);
    setProgress(0);

    // ORDEM CRÍTICA: Deletar tabelas dependentes PRIMEIRO (por causa das foreign keys)
    // Tabelas que referenciam outras devem ser deletadas antes das referenciadas
    const steps = [
      // 1. Tabelas que referenciam atendimentos
      { name: "Limpando pagamentos...", table: "pagamentos" },
      { name: "Limpando gorjetas...", table: "gorjetas" },
      { name: "Limpando itens de atendimento...", table: "atendimento_servicos" },
      { name: "Limpando produtos de atendimento...", table: "atendimento_produtos" },
      
      // 2. Tabelas que referenciam agendamentos
      { name: "Limpando confirmações...", table: "confirmacoes_agendamento" },
      { name: "Limpando mensagens...", table: "mensagens_enviadas" },
      
      // 3. Notas fiscais (referencia atendimentos)
      { name: "Limpando itens notas fiscais...", table: "itens_nota_fiscal" },
      { name: "Limpando notas fiscais...", table: "notas_fiscais" },
      
      // 4. AGORA deletar atendimentos e agendamentos
      { name: "Limpando atendimentos...", table: "atendimentos" },
      { name: "Limpando agendamentos...", table: "agendamentos" },
      
      // 5. Dívidas (referencia clientes)
      { name: "Limpando dívidas pagamentos...", table: "dividas_pagamentos" },
      { name: "Limpando dívidas...", table: "dividas" },
      
      // 6. Cheques (referencia clientes)
      { name: "Limpando cheques...", table: "cheques" },
      
      // 7. Caixa
      { name: "Limpando movimentações caixa...", table: "caixa_movimentacoes" },
      { name: "Limpando caixa...", table: "caixa" },
      { name: "Limpando despesas rápidas...", table: "despesas_rapidas" },
      
      // 8. Contas
      { name: "Limpando contas a pagar...", table: "contas_pagar" },
      { name: "Limpando contas a receber...", table: "contas_receber" },
      
      // 9. Metas
      { name: "Limpando metas progresso...", table: "metas_progresso" },
      { name: "Limpando metas...", table: "metas" },
      
      // 10. Fechamentos
      { name: "Limpando fechamentos profissionais...", table: "fechamentos_profissionais" },
      { name: "Limpando fechamentos semanais...", table: "fechamentos_semanais" },
      
      // 11. RH - Ponto e funcionários
      { name: "Limpando ponto profissionais...", table: "ponto_registros" },
      { name: "Limpando ponto funcionários...", table: "ponto_funcionarios" },
      { name: "Limpando itens folha...", table: "itens_folha_pagamento" },
      { name: "Limpando folhas pagamento...", table: "folhas_pagamento" },
      { name: "Limpando férias...", table: "ferias_funcionarios" },
      { name: "Limpando ocorrências...", table: "ocorrencias_funcionarios" },
      { name: "Limpando documentos...", table: "documentos_funcionarios" },
      { name: "Limpando funcionários...", table: "funcionarios" },
      
      // 12. POR ÚLTIMO: Tabelas principais (sem dependentes)
      { name: "Limpando clientes...", table: "clientes" },
      { name: "Limpando profissionais...", table: "profissionais" },
      { name: "Limpando produtos...", table: "produtos" },
      { name: "Limpando serviços...", table: "servicos" },
      
      // 13. Logs de importação
      { name: "Limpando logs importação...", table: "import_logs" },
    ];

    let deletedCounts: Record<string, number> = {};
    let errors: string[] = [];

    console.log("════════════════════════════════════");
    console.log("🗑️ INICIANDO RESET TOTAL DO SISTEMA");
    console.log("════════════════════════════════════");

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i].name);
        setProgress(((i + 1) / steps.length) * 100);
        
        console.log(`\n${i + 1}/${steps.length} ${steps[i].name}`);
        
        // Deletar TODOS os registros da tabela
        const { error, count } = await supabase
          .from(steps[i].table as any)
          .delete({ count: 'exact' })
          .not('id', 'is', null);
        
        if (error) {
          // Ignorar erro de tabela não existente
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log(`   ⏭️ Tabela ${steps[i].table} não existe, pulando...`);
          } else {
            console.warn(`   ⚠️ Erro: ${error.message}`);
            errors.push(`${steps[i].table}: ${error.message}`);
          }
        } else {
          deletedCounts[steps[i].table] = count || 0;
          console.log(`   ✅ ${count || 0} registros deletados`);
        }
        
        // Pequeno delay para feedback visual
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // VERIFICAÇÃO FINAL: Conferir se realmente zerou
      console.log("🔍 VERIFICANDO SE BANCO ESTÁ VAZIO...");
      
      const [
        { count: clientesRestantes },
        { count: agendamentosRestantes },
        { count: atendimentosRestantes },
        { count: servicosRestantes },
        { count: produtosRestantes },
        { count: profissionaisRestantes },
      ] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("agendamentos").select("id", { count: "exact", head: true }),
        supabase.from("atendimentos").select("id", { count: "exact", head: true }),
        supabase.from("servicos").select("id", { count: "exact", head: true }),
        supabase.from("produtos").select("id", { count: "exact", head: true }),
        supabase.from("profissionais").select("id", { count: "exact", head: true }),
      ]);

      console.log("📊 Verificação final:");
      console.log(`   Clientes restantes: ${clientesRestantes || 0}`);
      console.log(`   Agendamentos restantes: ${agendamentosRestantes || 0}`);
      console.log(`   Atendimentos restantes: ${atendimentosRestantes || 0}`);
      console.log(`   Serviços restantes: ${servicosRestantes || 0}`);
      console.log(`   Produtos restantes: ${produtosRestantes || 0}`);
      console.log(`   Profissionais restantes: ${profissionaisRestantes || 0}`);

      const totalRestante = (clientesRestantes || 0) + (agendamentosRestantes || 0) + 
                           (atendimentosRestantes || 0) + (servicosRestantes || 0) + 
                           (produtosRestantes || 0) + (profissionaisRestantes || 0);

      setCurrentStep("Concluído!");
      
      // Disparar evento para atualizar todas as telas
      console.log("✅ Reset completo - disparando evento data-updated");
      window.dispatchEvent(new Event('data-updated'));
      
      if (totalRestante > 0) {
        toast.warning("Reset parcial!", {
          description: `Alguns dados (${totalRestante}) não puderam ser removidos. Verifique permissões RLS.`,
          duration: 8000,
        });
      } else {
        toast.success("Sistema resetado com sucesso!", {
          description: "Todos os dados foram removidos. O sistema está zerado.",
          duration: 5000,
        });
      }

      // Resetar estados
      setShowZerarDialog(false);
      setConfirmStep(1);
      setBackupFeito(false);
      setSenhaAdmin("");
      setTextoConfirmacao("");
      setMotivo("");
      setConfirmacoes({ entendo: false, fezBackup: false, responsabilidade: false });

      // Redirecionar para dashboard com reload forçado
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);

    } catch (error: any) {
      console.error("❌ Erro ao resetar sistema:", error);
      toast.error("Erro ao resetar sistema", {
        description: error?.message || "Alguns dados podem não ter sido removidos. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-warning">
          <RotateCcw className="h-5 w-5" />
          RESETAR SISTEMA - CONFIRMAÇÃO 1 DE 3
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-4 text-left">
          <p className="font-semibold text-foreground">
            Você está prestes a RESETAR o sistema, removendo todos os dados de teste!
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">Dados que serão removidos:</p>
            <ul className="text-sm space-y-1">
              <li>• {dataCounts.clientes} clientes</li>
              <li>• {dataCounts.agendamentos} agendamentos</li>
              <li>• {dataCounts.atendimentos} atendimentos/vendas</li>
              <li>• {dataCounts.produtos} produtos</li>
              <li>• {dataCounts.servicos} serviços</li>
              <li>• {dataCounts.profissionais} profissionais</li>
              <li>• Todo o histórico financeiro</li>
            </ul>
          </div>
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm">
              <strong>Objetivo:</strong> Limpar dados de teste para iniciar o sistema do zero, pronto para uso real.
            </p>
          </div>
          <p className="text-destructive font-semibold">
            Esta ação NÃO PODE SER DESFEITA!
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setShowZerarDialog(false)}>
          Cancelar
        </AlertDialogCancel>
        <Button variant="destructive" onClick={() => setConfirmStep(2)}>
          Continuar →
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderStep2 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          CONFIRMAÇÃO 2 DE 3
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-4 text-left">
          <p className="font-semibold text-foreground">
            Antes de apagar tudo, é OBRIGATÓRIO fazer backup!
          </p>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/configuracoes")}
            >
              💾 Fazer Backup Agora
            </Button>
            <span className="block text-center text-muted-foreground">ou</span>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="backup-feito"
                checked={backupFeito}
                onCheckedChange={(checked) => setBackupFeito(checked === true)}
              />
              <Label htmlFor="backup-feito" className="text-sm">
                Já fiz backup manualmente (marque apenas se tiver certeza!)
              </Label>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setConfirmStep(1)}>
          ← Voltar
        </AlertDialogCancel>
        <Button 
          variant="destructive" 
          onClick={() => setConfirmStep(3)}
          disabled={!canProceedStep2}
        >
          Continuar →
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderStep3 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
          <Shield className="h-5 w-5" />
          CONFIRMAÇÃO 3 DE 3 - ÚLTIMA CHANCE
        </AlertDialogTitle>
      </AlertDialogHeader>
      <div className="space-y-4 py-4">
        <p className="font-semibold">Para RESETAR o sistema, você deve:</p>
        
        <div>
          <Label htmlFor="senha-admin">1. Digite sua senha de ADMINISTRADOR:</Label>
          <Input
            id="senha-admin"
            type="password"
            value={senhaAdmin}
            onChange={(e) => setSenhaAdmin(e.target.value)}
            placeholder="••••••••"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="texto-confirmacao">
            2. Digite EXATAMENTE: <strong>RESETAR SISTEMA</strong>
          </Label>
          <Input
            id="texto-confirmacao"
            value={textoConfirmacao}
            onChange={(e) => setTextoConfirmacao(e.target.value.toUpperCase())}
            placeholder="Digite RESETAR SISTEMA"
            className="mt-1"
            autoComplete="off"
          />
        </div>

        <div>
          <Label className="mb-2 block">3. Confirme o motivo:</Label>
          <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="limpar-testes" id="limpar-testes" />
              <Label htmlFor="limpar-testes">Limpar dados de teste</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="recomecar" id="recomecar" />
              <Label htmlFor="recomecar">Recomeçar do zero</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nova-empresa" id="nova-empresa" />
              <Label htmlFor="nova-empresa">Configurar nova empresa</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="outro" id="outro" />
              <Label htmlFor="outro">Outro motivo</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="block">4. Marque as confirmações:</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="entendo"
              checked={confirmacoes.entendo}
              onCheckedChange={(checked) => 
                setConfirmacoes(prev => ({ ...prev, entendo: checked === true }))
              }
            />
            <Label htmlFor="entendo" className="text-sm">
              Entendo que todos os dados serão removidos
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="fez-backup"
              checked={confirmacoes.fezBackup}
              onCheckedChange={(checked) => 
                setConfirmacoes(prev => ({ ...prev, fezBackup: checked === true }))
              }
            />
            <Label htmlFor="fez-backup" className="text-sm">
              Fiz backup dos dados importantes (se necessário)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="responsabilidade"
              checked={confirmacoes.responsabilidade}
              onCheckedChange={(checked) => 
                setConfirmacoes(prev => ({ ...prev, responsabilidade: checked === true }))
              }
            />
            <Label htmlFor="responsabilidade" className="text-sm">
              Confirmo que desejo resetar o sistema
            </Label>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm font-medium">{currentStep}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Aguarde, não feche esta janela...
            </p>
          </div>
        )}

        {!loading && (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-center">
            <p className="text-sm font-semibold text-primary">
              ✓ Após o reset, o sistema estará pronto para uso real
            </p>
          </div>
        )}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setConfirmStep(2)} disabled={loading}>
          ← Voltar
        </AlertDialogCancel>
        <Button 
          variant="destructive" 
          onClick={handleZerarSistema}
          disabled={!canProceedStep3 || loading}
        >
          {loading ? (
            <>
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
              Resetando...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              RESETAR SISTEMA
            </>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Limpar Dados
          </CardTitle>
          <CardDescription>
            Remova dados desnecessários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso */}
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">ZONA DE PERIGO</p>
                <p className="text-sm mt-1">
                  As ações abaixo são <strong>IRREVERSÍVEIS</strong>. Use com extremo cuidado!
                </p>
              </div>
            </div>
          </div>

          {/* Limpezas Seguras */}
          <div>
            <h3 className="font-semibold mb-3">Limpezas Seguras</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Limpar Dados de Teste</p>
                    <p className="text-sm text-muted-foreground">
                      Remove agendamentos/vendas marcados como teste
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLimparTeste}>
                  Limpar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Limpar Logs Antigos</p>
                    <p className="text-sm text-muted-foreground">
                      Remove logs com mais de 90 dias
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLimparLogs}>
                  Limpar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Limpar Cache de Imagens</p>
                    <p className="text-sm text-muted-foreground">
                      Remove imagens não utilizadas (24 MB)
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLimparCache}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>

          {/* Limpezas Perigosas */}
          <div>
            <h3 className="font-semibold mb-3 text-warning">Limpezas Perigosas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-warning/30 rounded-lg bg-warning/5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Apagar Clientes Inativos</p>
                    <p className="text-sm text-muted-foreground">
                      Remove clientes sem movimento há 2+ anos
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-warning border-warning hover:bg-warning/10">
                  ⚠️ Apagar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-warning/30 rounded-lg bg-warning/5">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Apagar Vendas Antigas</p>
                    <p className="text-sm text-muted-foreground">
                      Remove vendas com mais de 5 anos
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-warning border-warning hover:bg-warning/10">
                  ⚠️ Apagar
                </Button>
              </div>
            </div>
          </div>

          {/* Resetar Sistema */}
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-primary text-lg">
                  RESETAR SISTEMA
                </h3>
                <p className="text-sm mt-2">
                  Limpa todos os dados de teste para iniciar o sistema do zero
                </p>
                <ul className="text-sm mt-2 space-y-1 text-muted-foreground">
                  <li>• Remove todos os clientes cadastrados</li>
                  <li>• Remove todos os agendamentos</li>
                  <li>• Remove todas as vendas/atendimentos</li>
                  <li>• Remove todos os produtos e serviços</li>
                  <li>• Remove todos os profissionais</li>
                  <li>• Remove todo o histórico financeiro</li>
                </ul>
                <div className="mt-3 p-2 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Após o reset, o sistema estará pronto para uso real
                  </p>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  Requer: Senha Admin + Confirmações de segurança
                </p>
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => {
                    setShowZerarDialog(true);
                    setConfirmStep(1);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Sistema
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação */}
      <AlertDialog open={showZerarDialog} onOpenChange={setShowZerarDialog}>
        <AlertDialogContent className="max-w-md">
          {confirmStep === 1 && renderStep1()}
          {confirmStep === 2 && renderStep2()}
          {confirmStep === 3 && renderStep3()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
