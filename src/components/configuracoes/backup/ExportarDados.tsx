import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Download, Users, Package, DollarSign, UserCheck, Calendar, Scissors, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type ExportItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  table: string;
  count: number;
};

export default function ExportarDados() {
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [formato, setFormato] = useState("xlsx");
  const [dataInicio, setDataInicio] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const [exportItems, setExportItems] = useState<ExportItem[]>([
    { id: "clientes", label: "Clientes", icon: Users, table: "clientes", count: 0 },
    { id: "produtos", label: "Produtos", icon: Package, table: "produtos", count: 0 },
    { id: "atendimentos", label: "Vendas", icon: DollarSign, table: "atendimentos", count: 0 },
    { id: "profissionais", label: "Profissionais", icon: UserCheck, table: "profissionais", count: 0 },
    { id: "servicos", label: "Serviços", icon: Scissors, table: "servicos", count: 0 },
    { id: "agendamentos", label: "Agendamentos", icon: Calendar, table: "agendamentos", count: 0 },
  ]);

  // Fetch counts on mount
  useState(() => {
    const fetchCounts = async () => {
      for (const item of exportItems) {
        const tableName = item.table as "clientes" | "produtos" | "atendimentos" | "profissionais" | "servicos" | "agendamentos";
        const { count } = await supabase.from(tableName).select("*", { count: "exact", head: true });
        setExportItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, count: count || 0 } : i
        ));
      }
    };
    fetchCounts();
  });

  const handleExportSingle = async (item: ExportItem) => {
    setLoadingItem(item.id);

    try {
      const tableName = item.table as "clientes" | "produtos" | "atendimentos" | "profissionais" | "servicos" | "agendamentos";
      const { data, error } = await supabase.from(tableName).select("*");
      if (error) throw error;

      if (formato === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(data || []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, item.label);
        XLSX.writeFile(wb, `${item.table}-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
      } else if (formato === "csv") {
        const ws = XLSX.utils.json_to_sheet(data || []);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.table}-${format(new Date(), "dd-MM-yyyy")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.table}-${format(new Date(), "dd-MM-yyyy")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success(`${item.label} exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error(`Erro ao exportar ${item.label}`);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleExportPersonalizado = async () => {
    if (itensSelecionados.length === 0) {
      toast.error("Selecione pelo menos um item para exportar");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const wb = XLSX.utils.book_new();
      const totalItems = itensSelecionados.length;

      for (let i = 0; i < itensSelecionados.length; i++) {
        const itemId = itensSelecionados[i];
        const item = exportItems.find(e => e.id === itemId);
        if (!item) continue;

        const tableName = item.table as "clientes" | "produtos" | "atendimentos" | "profissionais" | "servicos" | "agendamentos";
        const { data, error } = await supabase.from(tableName).select("*");
        if (error) throw error;

        const ws = XLSX.utils.json_to_sheet(data || []);
        XLSX.utils.book_append_sheet(wb, ws, item.label);

        setProgress(((i + 1) / totalItems) * 100);
      }

      XLSX.writeFile(wb, `exportacao-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
      toast.success("Exportação personalizada concluída!");
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const toggleItem = (id: string) => {
    setItensSelecionados(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Dados
          </CardTitle>
          <CardDescription>
            Exporte dados do sistema em diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Exportações Rápidas */}
          <div>
            <h3 className="font-semibold mb-3">Exportações Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportItems.slice(0, 4).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto p-4 justify-start"
                    onClick={() => handleExportSingle(item)}
                    disabled={loadingItem === item.id}
                  >
                    <Icon className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Exportar {item.label} (Excel)</p>
                      <p className="text-xs text-muted-foreground">{item.count} registros</p>
                    </div>
                    {loadingItem === item.id && (
                      <FileSpreadsheet className="h-4 w-4 ml-auto animate-pulse" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Exportação Personalizada */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Exportação Personalizada</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Selecione os dados:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {exportItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`exp-${item.id}`}
                        checked={itensSelecionados.includes(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <Label htmlFor={`exp-${item.id}`}>{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-inicio">De:</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="data-fim">Até:</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Formato:</Label>
                <RadioGroup value={formato} onValueChange={setFormato} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="xlsx" id="xlsx" />
                    <Label htmlFor="xlsx">Excel (.xlsx)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv">CSV (.csv)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json">JSON (.json)</Label>
                  </div>
                </RadioGroup>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">Exportando dados...</p>
                </div>
              )}

              <Button 
                onClick={handleExportPersonalizado} 
                disabled={itensSelecionados.length === 0 || loading}
                isLoading={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Personalizado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
