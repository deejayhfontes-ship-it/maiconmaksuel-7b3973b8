import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, 
  Wifi, 
  Users, 
  Scissors, 
  Package, 
  Calendar, 
  DollarSign,
  UserPlus,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle
} from "lucide-react";

type LogEntry = {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
};

type RecordCounts = {
  clientes: number;
  profissionais: number;
  servicos: number;
  produtos: number;
  agendamentos: number;
  atendimentos: number;
};

export default function DiagnosticoSistema() {
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [connectionError, setConnectionError] = useState("");
  const [recordCounts, setRecordCounts] = useState<RecordCounts>({
    clientes: 0,
    profissionais: 0,
    servicos: 0,
    produtos: 0,
    agendamentos: 0,
    atendimentos: 0,
  });
  const [countingRecords, setCountingRecords] = useState(false);
  const [insertStatus, setInsertStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [insertMessage, setInsertMessage] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => {
      const newLogs = [...prev, { time, message, type }];
      // Keep only last 10 logs
      return newLogs.slice(-10);
    });
  };

  useEffect(() => {
    addLog("Página de diagnóstico carregada", "info");
    addLog("Componente renderizado com sucesso", "success");
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const testConnection = async () => {
    setConnectionStatus("loading");
    addLog("Iniciando teste de conexão...", "info");

    try {
      const { count, error } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      setConnectionStatus("success");
      setConnectionError("");
      addLog("Conexão com banco de dados estabelecida com sucesso!", "success");
    } catch (error: any) {
      setConnectionStatus("error");
      setConnectionError(error.message || "Erro desconhecido");
      addLog(`Erro na conexão: ${error.message}`, "error");
    }
  };

  const countRecords = async () => {
    setCountingRecords(true);
    addLog("Contando registros nas tabelas...", "info");

    try {
      const tables = [
        { key: "clientes", table: "clientes" },
        { key: "profissionais", table: "profissionais" },
        { key: "servicos", table: "servicos" },
        { key: "produtos", table: "produtos" },
        { key: "agendamentos", table: "agendamentos" },
        { key: "atendimentos", table: "atendimentos" },
      ] as const;

      const counts: RecordCounts = {
        clientes: 0,
        profissionais: 0,
        servicos: 0,
        produtos: 0,
        agendamentos: 0,
        atendimentos: 0,
      };

      for (const { key, table } of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (!error && count !== null) {
          counts[key] = count;
        }
      }

      setRecordCounts(counts);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      addLog(`Contagem concluída: ${total} registros encontrados`, "success");
    } catch (error: any) {
      addLog(`Erro ao contar registros: ${error.message}`, "error");
    } finally {
      setCountingRecords(false);
    }
  };

  const insertTestClient = async () => {
    setInsertStatus("loading");
    setInsertMessage("");
    addLog("Iniciando inserção de cliente teste...", "info");

    try {
      const testClient = {
        nome: `Cliente Teste ${Date.now()}`,
        celular: "(11) 99999-9999",
        email: `teste${Date.now()}@teste.com`,
        observacoes: "Cliente criado para teste de diagnóstico",
      };

      const { data, error } = await supabase
        .from("clientes")
        .insert(testClient)
        .select()
        .single();

      if (error) throw error;

      setInsertStatus("success");
      setInsertMessage(`Cliente "${testClient.nome}" inserido com sucesso!`);
      addLog(`Cliente teste inserido com ID: ${data.id}`, "success");
      
      // Recount records after successful insert
      await countRecords();
    } catch (error: any) {
      setInsertStatus("error");
      setInsertMessage(error.message || "Erro ao inserir cliente");
      addLog(`Erro ao inserir cliente: ${error.message}`, "error");
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      default:
        return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "Não configurado";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Diagnóstico do Sistema
        </h2>
        <p className="text-muted-foreground text-sm">
          Teste a conexão, verifique registros e execute diagnósticos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Status da Conexão */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Status da Conexão</h3>
          </div>

          <Button 
            onClick={testConnection} 
            disabled={connectionStatus === "loading"}
            className="w-full mb-4"
          >
            {connectionStatus === "loading" ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              {connectionStatus === "idle" && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Aguardando teste...
                </span>
              )}
              {connectionStatus === "loading" && (
                <span className="flex items-center gap-1 text-blue-500">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Testando...
                </span>
              )}
              {connectionStatus === "success" && (
                <span className="flex items-center gap-1 text-green-500">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Conectado
                </span>
              )}
              {connectionStatus === "error" && (
                <span className="flex items-center gap-1 text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Erro: {connectionError}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">URL:</span>
              <span className="text-xs break-all font-mono bg-muted px-2 py-1 rounded">
                {supabaseUrl.replace("https://", "").slice(0, 40)}...
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Registros no Banco */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Registros no Banco</h3>
          </div>

          <Button 
            onClick={countRecords} 
            disabled={countingRecords}
            className="w-full mb-4"
          >
            {countingRecords ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Contando...
              </>
            ) : (
              "Contar Registros"
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Clientes:</span>
              <span className="font-semibold ml-auto">{recordCounts.clientes}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Profissionais:</span>
              <span className="font-semibold ml-auto">{recordCounts.profissionais}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Scissors className="h-4 w-4 text-pink-500" />
              <span>Serviços:</span>
              <span className="font-semibold ml-auto">{recordCounts.servicos}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Package className="h-4 w-4 text-orange-500" />
              <span>Produtos:</span>
              <span className="font-semibold ml-auto">{recordCounts.produtos}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>Agendamentos:</span>
              <span className="font-semibold ml-auto">{recordCounts.agendamentos}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Vendas:</span>
              <span className="font-semibold ml-auto">{recordCounts.atendimentos}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Teste de Inserção */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Teste de Inserção</h3>
          </div>

          <Button 
            onClick={insertTestClient} 
            disabled={insertStatus === "loading"}
            className="w-full mb-4"
          >
            {insertStatus === "loading" ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Inserindo...
              </>
            ) : (
              "Inserir Cliente Teste"
            )}
          </Button>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Último teste:</span>
              <span>
                {insertStatus === "idle" && "Aguardando..."}
                {insertStatus === "loading" && "Em andamento..."}
                {insertStatus === "success" && new Date().toLocaleTimeString("pt-BR")}
                {insertStatus === "error" && new Date().toLocaleTimeString("pt-BR")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">Resultado:</span>
              {insertStatus === "idle" && <span>-</span>}
              {insertStatus === "loading" && <span className="text-blue-500">Processando...</span>}
              {insertStatus === "success" && (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Sucesso
                </span>
              )}
              {insertStatus === "error" && (
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {insertMessage}
                </span>
              )}
            </div>
            {insertStatus === "success" && insertMessage && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {insertMessage}
              </p>
            )}
          </div>
        </Card>

        {/* Card 4: Console de Logs */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Console de Logs</h3>
          </div>

          <ScrollArea className="h-[200px] bg-slate-950 rounded-lg p-3">
            <div className="font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <p className="text-slate-500">Nenhum log registrado...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    {getLogIcon(log.type)}
                    <span className={
                      log.type === "success" ? "text-green-400" :
                      log.type === "error" ? "text-red-400" :
                      log.type === "warning" ? "text-yellow-400" :
                      "text-blue-400"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            (Últimas 10 ações)
          </p>
        </Card>
      </div>
    </div>
  );
}

