import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, FileSpreadsheet, FileJson, Search, Upload, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type ImportOption = "excel" | "sistema-antigo" | "json";
type TipoDados = "clientes" | "produtos" | "servicos" | "profissionais";

type ColunaMapeamento = {
  colunaExcel: string;
  campoSistema: string;
};

export default function ImportarDados() {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<ImportOption | null>(null);
  const [tipoDados, setTipoDados] = useState<TipoDados>("clientes");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mapeamento, setMapeamento] = useState<ColunaMapeamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [opcoes, setOpcoes] = useState({
    validar: true,
    ignorarDuplicados: true,
    criarBackup: true,
  });

  // Simulação de colunas detectadas
  const [colunasDetectadas] = useState([
    "Nome",
    "Telefone",
    "CPF",
    "Email",
    "Data Nascimento",
    "Endereço",
  ]);

  const camposSistema = [
    { value: "nome", label: "Nome" },
    { value: "telefone", label: "Telefone" },
    { value: "celular", label: "Celular" },
    { value: "cpf", label: "CPF" },
    { value: "email", label: "Email" },
    { value: "data_nascimento", label: "Data Nascimento" },
    { value: "endereco", label: "Endereço" },
    { value: "ignorar", label: "(Ignorar)" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      // Simular detecção de colunas
      setMapeamento(colunasDetectadas.map((col, i) => ({
        colunaExcel: col,
        campoSistema: camposSistema[i]?.value || "ignorar",
      })));
      toast.success(`Arquivo carregado: ${file.name}`);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      toast.success("Dados importados com sucesso!", {
        description: "245 registros importados",
      });
    } catch (error) {
      toast.error("Erro ao importar dados");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const renderExcelImport = () => (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Tipo de dados:</Label>
        <RadioGroup value={tipoDados} onValueChange={(v) => setTipoDados(v as TipoDados)} className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="clientes" id="tipo-clientes" />
            <Label htmlFor="tipo-clientes">Clientes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="produtos" id="tipo-produtos" />
            <Label htmlFor="tipo-produtos">Produtos</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="servicos" id="tipo-servicos" />
            <Label htmlFor="tipo-servicos">Serviços</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="profissionais" id="tipo-profissionais" />
            <Label htmlFor="tipo-profissionais">Profissionais</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Arquivo:</Label>
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="mt-1"
        />
      </div>

      {arquivo && mapeamento.length > 0 && (
        <>
          <div>
            <h4 className="font-medium mb-2">Mapeamento de Colunas</h4>
            <div className="border rounded-lg divide-y">
              {mapeamento.map((map, index) => (
                <div key={index} className="p-3 flex items-center gap-4">
                  <span className="w-40">{map.colunaExcel}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={map.campoSistema}
                    onValueChange={(value) => {
                      const newMap = [...mapeamento];
                      newMap[index].campoSistema = value;
                      setMapeamento(newMap);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {camposSistema.map(campo => (
                        <SelectItem key={campo.value} value={campo.value}>
                          {campo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Preview (primeiras 5 linhas):</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Maria Silva | (35) 99999-9999 | maria@email.com</p>
              <p>João Santos | (35) 98888-8888 | joao@email.com</p>
              <p>Ana Oliveira | (35) 97777-7777 | ana@email.com</p>
              <p>...</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="validar"
                checked={opcoes.validar}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, validar: checked === true }))}
              />
              <Label htmlFor="validar">Validar dados antes de importar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ignorar"
                checked={opcoes.ignorarDuplicados}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, ignorarDuplicados: checked === true }))}
              />
              <Label htmlFor="ignorar">Ignorar duplicados (verificar por CPF/Tel)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="backup"
                checked={opcoes.criarBackup}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, criarBackup: checked === true }))}
              />
              <Label htmlFor="backup">Criar backup antes de importar</Label>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderSistemaAntigoImport = () => (
    <div className="space-y-4">
      <div>
        <Label>Localização do banco de dados:</Label>
        <div className="flex gap-2 mt-1">
          <Input placeholder="C:\BelezaSoft\dados.db" className="flex-1" />
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Procurar
          </Button>
        </div>
      </div>

      <div className="text-center py-4">
        <span className="text-muted-foreground">ou</span>
      </div>

      <div>
        <Label>Pasta de instalação:</Label>
        <div className="flex gap-2 mt-1">
          <Input placeholder="C:\Program Files\BelezaSoft" className="flex-1" />
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Procurar
          </Button>
        </div>
        <Button variant="link" className="mt-2 px-0">
          🔍 Detectar Automaticamente
        </Button>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Dados encontrados:</h4>
        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Clientes: 1.520 registros
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Serviços: 38 registros
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Profissionais: 8 registros
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Produtos: 142 registros
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Vendas: 6.234 registros
          </li>
        </ul>
      </div>

      <div>
        <Label className="mb-2 block">Importar:</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id="imp-clientes" defaultChecked />
            <Label htmlFor="imp-clientes">Clientes</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="imp-servicos" defaultChecked />
            <Label htmlFor="imp-servicos">Serviços</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="imp-profissionais" defaultChecked />
            <Label htmlFor="imp-profissionais">Profissionais</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="imp-produtos" defaultChecked />
            <Label htmlFor="imp-produtos">Produtos</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="imp-vendas" />
            <Label htmlFor="imp-vendas">Vendas (histórico)</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="backup-import" defaultChecked />
        <Label htmlFor="backup-import">Criar backup antes de importar</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Importar Dados
          </CardTitle>
          <CardDescription>
            Importe dados de outros sistemas ou planilhas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Opções de Importação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={opcaoSelecionada === "excel" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setOpcaoSelecionada("excel")}
            >
              <FileSpreadsheet className="h-8 w-8" />
              <span>Importar Planilha Excel</span>
              <span className="text-xs opacity-70">(.xlsx, .csv)</span>
            </Button>

            <Button
              variant={opcaoSelecionada === "sistema-antigo" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setOpcaoSelecionada("sistema-antigo")}
            >
              <Database className="h-8 w-8" />
              <span>Importar do Sistema Antigo</span>
              <span className="text-xs opacity-70">(BelezaSoft)</span>
            </Button>

            <Button
              variant={opcaoSelecionada === "json" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setOpcaoSelecionada("json")}
            >
              <FileJson className="h-8 w-8" />
              <span>Importar de Outro Arquivo</span>
              <span className="text-xs opacity-70">(.json)</span>
            </Button>
          </div>

          {/* Conteúdo específico */}
          {opcaoSelecionada === "excel" && renderExcelImport()}
          {opcaoSelecionada === "sistema-antigo" && renderSistemaAntigoImport()}
          {opcaoSelecionada === "json" && (
            <div>
              <Label>Arquivo JSON:</Label>
              <Input type="file" accept=".json" className="mt-1" />
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">Importando dados...</p>
            </div>
          )}

          {/* Actions */}
          {opcaoSelecionada && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpcaoSelecionada(null)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} isLoading={loading}>
                <Upload className="h-4 w-4 mr-2" />
                {arquivo ? `Importar ${245} registros` : "Importar Dados"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
