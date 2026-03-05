import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Upload, AlertTriangle, Check, FolderOpen, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type BackupOption = {
  id: string;
  data: Date;
  tipo: "manual" | "automatico";
  tamanho: string;
  local: string;
  verificado: boolean;
  conteudo: {
    clientes: number;
    agendamentos: number;
    vendas: number;
    produtos: number;
    profissionais: number;
  };
};

export default function RestaurarBackup() {
  const navigate = useNavigate();
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [tipoRestauracao, setTipoRestauracao] = useState("tudo");
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [confirmacaoLida, setConfirmacaoLida] = useState(false);
  const [arquivoLocal, setArquivoLocal] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const [backupOptions] = useState<BackupOption[]>([
    {
      id: "1",
      data: new Date(2024, 11, 28, 22, 30),
      tipo: "manual",
      tamanho: "145 MB",
      local: "Local",
      verificado: true,
      conteudo: { clientes: 1247, agendamentos: 8942, vendas: 5683, produtos: 156, profissionais: 12 },
    },
    {
      id: "2",
      data: new Date(2024, 11, 1, 2, 0),
      tipo: "automatico",
      tamanho: "142 MB",
      local: "Google Drive",
      verificado: true,
      conteudo: { clientes: 1200, agendamentos: 8500, vendas: 5400, produtos: 150, profissionais: 12 },
    },
    {
      id: "3",
      data: new Date(2024, 10, 1, 2, 0),
      tipo: "automatico",
      tamanho: "138 MB",
      local: "Local",
      verificado: true,
      conteudo: { clientes: 1150, agendamentos: 8100, vendas: 5100, produtos: 145, profissionais: 11 },
    },
  ]);

  const selectedBackupData = backupOptions.find(b => b.id === selectedBackup);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoLocal(file);
      setSelectedBackup(null);
      toast.success(`Arquivo selecionado: ${file.name}`);
    }
  };

  const canRestore = () => {
    return (
      (selectedBackup || arquivoLocal) &&
      confirmacaoTexto === "RESTAURAR" &&
      senhaAdmin.length > 0 &&
      confirmacaoLida
    );
  };

  const handleRestore = async () => {
    if (!canRestore()) return;

    setShowConfirmDialog(false);
    setLoading(true);
    setProgress(0);

    try {
      const steps = ["Clientes", "Agendamentos", "Vendas", "Produtos", "Profissionais"];
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(`Restaurando: ${steps[i]}...`);
        await new Promise(resolve => setTimeout(resolve, 800));
        setProgress(((i + 1) / steps.length) * 100);
      }

      toast.success("Backup restaurado com sucesso!", {
        description: "O sistema será reiniciado em 5 segundos...",
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
      navigate("/dashboard");

    } catch (error) {
      console.error("Erro na restauração:", error);
      toast.error("Erro ao restaurar backup");
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Restaurar Backup
          </CardTitle>
          <CardDescription>
            Restaure dados de um backup anterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-warning">ATENÇÃO</p>
                <p className="text-sm mt-1">
                  Restaurar um backup irá <strong>SUBSTITUIR</strong> todos os dados atuais do sistema pelos dados do backup.
                </p>
                <p className="text-sm mt-2 font-medium">
                  Esta ação NÃO pode ser desfeita!
                </p>
                <p className="text-sm mt-2">
                  Recomendamos fazer um backup dos dados atuais antes de restaurar.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => navigate("/configuracoes")}>
            <Download className="h-4 w-4 mr-2" />
            Fazer Backup Antes de Continuar
          </Button>

          {/* Seleção de Backup */}
          <div>
            <h3 className="font-semibold mb-3">Selecionar Backup</h3>

            {/* Arquivo local */}
            <div className="mb-4">
              <Label className="mb-2 block">Opção 1: Arquivo do computador</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".json,.zip"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
              </div>
              {arquivoLocal && (
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo: {arquivoLocal.name}
                </p>
              )}
            </div>

            {/* Backups disponíveis */}
            <div>
              <Label className="mb-2 block">Opção 2: Backups disponíveis no sistema</Label>
              <div className="border rounded-lg divide-y">
                {backupOptions.map((backup) => (
                  <div
                    key={backup.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedBackup === backup.id ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedBackup(backup.id);
                      setArquivoLocal(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full border-2 ${
                          selectedBackup === backup.id 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedBackup === backup.id && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(backup.data, "dd/MM/yyyy HH:mm", { locale: ptBR })} - {backup.tipo === "manual" ? "Manual" : "Automático"} ({backup.tamanho})
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {backup.verificado && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Verificado
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{backup.local}</Badge>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <Info className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conteúdo do backup selecionado */}
            {selectedBackupData && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Contém:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Clientes: {selectedBackupData.conteudo.clientes} registros</li>
                  <li>• Agendamentos: {selectedBackupData.conteudo.agendamentos} registros</li>
                  <li>• Vendas: {selectedBackupData.conteudo.vendas} registros</li>
                  <li>• Produtos: {selectedBackupData.conteudo.produtos} registros</li>
                  <li>• Profissionais: {selectedBackupData.conteudo.profissionais} registros</li>
                  <li>• Configurações: incluídas</li>
                </ul>
              </div>
            )}
          </div>

          {/* Opções de Restauração */}
          <div>
            <h3 className="font-semibold mb-3">Opções de Restauração</h3>
            <RadioGroup value={tipoRestauracao} onValueChange={setTipoRestauracao} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="tudo" id="tudo" />
                <Label htmlFor="tudo">Restaurar tudo (Substitui todos os dados)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="seletivo" id="seletivo" />
                <Label htmlFor="seletivo">Restaurar seletivamente (Escolher o que restaurar)</Label>
              </div>
            </RadioGroup>

            {tipoRestauracao === "seletivo" && (
              <div className="mt-3 ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-clientes" />
                  <Label htmlFor="rest-clientes">Clientes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-agendamentos" />
                  <Label htmlFor="rest-agendamentos">Agendamentos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-vendas" />
                  <Label htmlFor="rest-vendas">Vendas</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-produtos" />
                  <Label htmlFor="rest-produtos">Produtos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-profissionais" />
                  <Label htmlFor="rest-profissionais">Profissionais</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rest-configuracoes" />
                  <Label htmlFor="rest-configuracoes">Configurações</Label>
                </div>
              </div>
            )}
          </div>

          {/* Confirmação */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">Confirmação (obrigatória)</h3>

            <div className="flex items-center gap-2">
              <Checkbox
                id="confirmacao-lida"
                checked={confirmacaoLida}
                onCheckedChange={(checked) => setConfirmacaoLida(checked === true)}
              />
              <Label htmlFor="confirmacao-lida" className="text-sm">
                Li e entendo que esta ação não pode ser desfeita e todos os dados atuais serão substituídos
              </Label>
            </div>

            <div>
              <Label htmlFor="confirmar-texto">
                Para confirmar, digite: <strong>RESTAURAR</strong>
              </Label>
              <Input
                id="confirmar-texto"
                value={confirmacaoTexto}
                onChange={(e) => setConfirmacaoTexto(e.target.value.toUpperCase())}
                placeholder="Digite RESTAURAR"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="senha-admin">Senha de Administrador:</Label>
              <Input
                id="senha-admin"
                type="password"
                value={senhaAdmin}
                onChange={(e) => setSenhaAdmin(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">NÃO FECHE o sistema</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!canRestore() || loading}
              variant="destructive"
            >
              <Upload className="h-4 w-4 mr-2" />
              Restaurar Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmação Final */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              CONFIRMAÇÃO FINAL
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a restaurar:</p>
              <p className="font-medium text-foreground">
                {selectedBackupData && (
                  <>Backup: {format(selectedBackupData.data, "dd/MM/yyyy HH:mm", { locale: ptBR })} ({selectedBackupData.tamanho})</>
                )}
              </p>
              <p className="text-destructive font-semibold">
                TODOS os dados atuais serão perdidos!
              </p>
              <p>Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-destructive hover:bg-destructive/90">
              Sim, Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
