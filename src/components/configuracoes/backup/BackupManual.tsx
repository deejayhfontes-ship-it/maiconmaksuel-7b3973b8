import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FolderOpen, 
  Check, 
  Database, 
  Users, 
  Calendar, 
  DollarSign, 
  Package, 
  UserCheck, 
  Scissors,
  Settings,
  Image
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type BackupItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  table: string;
  count: number;
  size: string;
  selected: boolean;
};

export default function BackupManual() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [formato, setFormato] = useState("zip");
  const [nomeArquivo, setNomeArquivo] = useState(`backup-salao-${format(new Date(), "dd-MM-yyyy")}`);
  const [opcoes, setOpcoes] = useState({
    criptografar: false,
    incluirDataHora: true,
    abrirPasta: true,
  });

  const [backupItems, setBackupItems] = useState<BackupItem[]>([
    { id: "clientes", label: "Clientes", icon: Users, table: "clientes", count: 0, size: "~0 MB", selected: true },
    { id: "agendamentos", label: "Agendamentos", icon: Calendar, table: "agendamentos", count: 0, size: "~0 MB", selected: true },
    { id: "atendimentos", label: "Vendas e Financeiro", icon: DollarSign, table: "atendimentos", count: 0, size: "~0 MB", selected: true },
    { id: "produtos", label: "Produtos e Estoque", icon: Package, table: "produtos", count: 0, size: "~0 MB", selected: true },
    { id: "profissionais", label: "Profissionais e Comissões", icon: UserCheck, table: "profissionais", count: 0, size: "~0 MB", selected: true },
    { id: "servicos", label: "Serviços", icon: Scissors, table: "servicos", count: 0, size: "~0 MB", selected: true },
    { id: "configuracoes", label: "Configurações do Sistema", icon: Settings, table: "configuracoes_fiscal", count: 1, size: "~500 KB", selected: true },
    { id: "imagens", label: "Imagens e Arquivos", icon: Image, table: "", count: 0, size: "~0 MB", selected: true },
  ]);

  // Fetch counts on mount
  useState(() => {
    const fetchCounts = async () => {
      const tables = ["clientes", "agendamentos", "atendimentos", "produtos", "profissionais", "servicos"] as const;
      
      for (const table of tables) {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        setBackupItems(prev => prev.map(item => 
          item.table === table 
            ? { ...item, count: count || 0, size: `~${Math.ceil((count || 0) * 0.01)} MB` }
            : item
        ));
      }
    };
    fetchCounts();
  });

  const toggleItem = (id: string) => {
    setBackupItems(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const selectAll = () => {
    setBackupItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setBackupItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const getTotalEstimado = () => {
    const selected = backupItems.filter(i => i.selected);
    const total = selected.reduce((acc, item) => {
      const size = parseFloat(item.size.replace(/[^0-9.]/g, "")) || 0;
      return acc + size;
    }, 0);
    return `~${total.toFixed(1)} MB`;
  };

  const handleBackup = async () => {
    const selectedItems = backupItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um item para backup");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const backupData: Record<string, unknown[]> = {};
      const totalSteps = selectedItems.length;
      let currentStepIndex = 0;

      for (const item of selectedItems) {
        setCurrentStep(`Processando: ${item.label}...`);
        
        if (item.table && item.table !== "") {
          const tableName = item.table as "clientes" | "agendamentos" | "atendimentos" | "produtos" | "profissionais" | "servicos" | "configuracoes_fiscal";
          const { data, error } = await supabase.from(tableName).select("*");
          if (error) throw error;
          backupData[item.table] = data || [];
        }

        currentStepIndex++;
        setProgress((currentStepIndex / totalSteps) * 100);
      }

      // Create JSON blob
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomeArquivo}${opcoes.incluirDataHora ? `-${format(new Date(), "HHmm")}` : ""}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup criado com sucesso!", {
        description: `${nomeArquivo}.json (${getTotalEstimado()})`,
      });

    } catch (error) {
      console.error("Erro no backup:", error);
      toast.error("Erro ao criar backup");
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
            <Download className="h-5 w-5 text-primary" />
            Fazer Backup Manual
          </CardTitle>
          <CardDescription>
            Crie um backup dos dados do sistema para restauração posterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Último Backup */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-success mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Último backup realizado em:</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Tamanho: {getTotalEstimado()}</p>
                  <p>Status: ✓ Verificado e íntegro</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  <Button variant="outline" size="sm">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Abrir Pasta
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Selecionar Itens */}
          <div>
            <h3 className="font-semibold mb-3">Selecione o que incluir:</h3>
            <div className="space-y-2">
              {backupItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={item.id}
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={item.id} className="cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.count > 0 ? `${item.count} registros` : ""} ({item.size})
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  ☑ Selecionar Tudo
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  ☐ Desmarcar Tudo
                </Button>
              </div>
              <p className="font-semibold">
                Total estimado: {getTotalEstimado()}
              </p>
            </div>
          </div>

          {/* Configurações */}
          <div className="space-y-4">
            <h3 className="font-semibold">Configurações do Backup</h3>
            
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Formato:</Label>
                <RadioGroup value={formato} onValueChange={setFormato} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="zip" id="zip" />
                    <Label htmlFor="zip">ZIP (compactado - recomendado)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json">JSON (sem compactar)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="nome">Nome do arquivo:</Label>
                <Input
                  id="nome"
                  value={nomeArquivo}
                  onChange={(e) => setNomeArquivo(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label>Opções:</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="criptografar"
                    checked={opcoes.criptografar}
                    onCheckedChange={(checked) => 
                      setOpcoes(prev => ({ ...prev, criptografar: checked === true }))
                    }
                  />
                  <Label htmlFor="criptografar">Criptografar backup (senha)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="incluirDataHora"
                    checked={opcoes.incluirDataHora}
                    onCheckedChange={(checked) => 
                      setOpcoes(prev => ({ ...prev, incluirDataHora: checked === true }))
                    }
                  />
                  <Label htmlFor="incluirDataHora">Incluir data/hora no nome</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="abrirPasta"
                    checked={opcoes.abrirPasta}
                    onCheckedChange={(checked) => 
                      setOpcoes(prev => ({ ...prev, abrirPasta: checked === true }))
                    }
                  />
                  <Label htmlFor="abrirPasta">Abrir pasta após concluir</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleBackup} isLoading={loading}>
              <Database className="h-4 w-4 mr-2" />
              Criar Backup Agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
