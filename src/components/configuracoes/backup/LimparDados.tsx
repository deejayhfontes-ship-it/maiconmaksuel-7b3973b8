import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Shield, Image, FileText, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type ConfirmStep = 1 | 2 | 3;

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

  const handleLimparTeste = async () => {
    toast.success("Dados de teste removidos!");
  };

  const handleLimparLogs = async () => {
    toast.success("Logs antigos removidos!");
  };

  const handleLimparCache = async () => {
    toast.success("Cache de imagens limpo! (24 MB liberados)");
  };

  const canProceedStep2 = backupFeito;
  const canProceedStep3 = 
    senhaAdmin.length >= 6 &&
    textoConfirmacao === "APAGAR TUDO" &&
    motivo.length > 0 &&
    confirmacoes.entendo &&
    confirmacoes.fezBackup &&
    confirmacoes.responsabilidade;

  const handleZerarSistema = async () => {
    setLoading(true);
    setProgress(0);

    try {
      const steps = ["Clientes", "Agendamentos", "Vendas", "Produtos", "Profissionais", "Financeiro", "Logs"];
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setProgress(((i + 1) / steps.length) * 100);
      }

      toast.success("Sistema zerado com sucesso!", {
        description: "O sistema será reiniciado em 5 segundos...",
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
      navigate("/dashboard");

    } catch (error) {
      console.error("Erro ao zerar sistema:", error);
      toast.error("Erro ao zerar sistema");
    } finally {
      setLoading(false);
      setShowZerarDialog(false);
      setConfirmStep(1);
    }
  };

  const renderStep1 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          CONFIRMAÇÃO 1 DE 3
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-4 text-left">
          <p className="font-semibold text-foreground">
            Você está prestes a APAGAR TODOS OS DADOS do sistema!
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">Isso inclui:</p>
            <ul className="text-sm space-y-1">
              <li>• 1.247 clientes</li>
              <li>• 8.942 agendamentos</li>
              <li>• 5.683 vendas</li>
              <li>• 156 produtos</li>
              <li>• 12 profissionais</li>
              <li>• TODO o histórico financeiro</li>
            </ul>
          </div>
          <p className="text-destructive font-semibold">
            Esta ação NÃO PODE SER DESFEITA!
          </p>
          <p>Tem certeza ABSOLUTA que deseja continuar?</p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setShowZerarDialog(false)}>
          Não, Cancelar
        </AlertDialogCancel>
        <Button variant="destructive" onClick={() => setConfirmStep(2)}>
          Sim, Continuar →
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
        <p className="font-semibold">Para APAGAR TUDO, você deve:</p>
        
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
            2. Digite EXATAMENTE: <strong>APAGAR TUDO</strong>
          </Label>
          <Input
            id="texto-confirmacao"
            value={textoConfirmacao}
            onChange={(e) => setTextoConfirmacao(e.target.value.toUpperCase())}
            placeholder="Digite APAGAR TUDO"
            className="mt-1"
            autoComplete="off"
          />
        </div>

        <div>
          <Label className="mb-2 block">3. Confirme o motivo:</Label>
          <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="recomecar" id="recomecar" />
              <Label htmlFor="recomecar">Recomeçar do zero</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="trocar" id="trocar" />
              <Label htmlFor="trocar">Trocar de empresa</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="teste" id="teste" />
              <Label htmlFor="teste">Sistema de teste</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="outro" id="outro" />
              <Label htmlFor="outro">Outro</Label>
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
              Entendo que todos os dados serão perdidos
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
              Fiz backup dos dados importantes
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
              Assumo total responsabilidade
            </Label>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">NÃO FECHE o sistema</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
          <p className="text-sm font-semibold text-destructive">
            ⚠️ ÚLTIMA CHANCE DE CANCELAR
          </p>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setConfirmStep(2)}>
          Cancelar Tudo
        </AlertDialogCancel>
        <Button 
          variant="destructive" 
          onClick={handleZerarSistema}
          disabled={!canProceedStep3 || loading}
          isLoading={loading}
        >
          🗑️ APAGAR TUDO AGORA
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

          {/* Apagar Tudo */}
          <div className="p-4 border-2 border-destructive rounded-lg bg-destructive/5">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive text-lg">
                  ZERAR SISTEMA COMPLETO
                </h3>
                <p className="text-sm mt-2">
                  ⚠️ APAGA <strong>TODOS</strong> OS DADOS DO SISTEMA
                </p>
                <ul className="text-sm mt-2 space-y-1 text-muted-foreground">
                  <li>• Todos os clientes</li>
                  <li>• Todos os agendamentos</li>
                  <li>• Todas as vendas</li>
                  <li>• Todos os produtos</li>
                  <li>• Todos os profissionais</li>
                  <li>• Todo o financeiro</li>
                  <li>• Configurações (mantém apenas padrão)</li>
                </ul>
                <p className="text-sm mt-3 font-semibold text-destructive">
                  ⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Requer: Senha Admin + 3 Confirmações
                </p>
                <Button 
                  variant="destructive" 
                  className="mt-4"
                  onClick={() => {
                    setShowZerarDialog(true);
                    setConfirmStep(1);
                  }}
                >
                  🚨 ZERAR SISTEMA COMPLETO
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
