import React, { Component, ErrorInfo } from "react";
import { AlertTriangle, RotateCcw, Home, Copy, Check } from "lucide-react";

interface ErrorLog {
  timestamp: string;
  route: string;
  message: string;
  stack?: string;
  componentStack?: string;
  type: "render" | "global" | "promise";
}

const MAX_LOGS = 50;
const STORAGE_KEY = "app_error_logs";

export function getErrorLogs(): ErrorLog[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearErrorLogs() {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveErrorLog(log: ErrorLog) {
  const logs = getErrorLogs();
  logs.unshift(log);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // storage full
  }
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    saveErrorLog({
      timestamp: new Date().toISOString(),
      route: window.location.href,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack || undefined,
      type: "render",
    });
  }

  handleCopy = () => {
    const { error } = this.state;
    const report = [
      `=== RELATÓRIO DE ERRO ===`,
      `Data: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Protocol: ${window.location.protocol}`,
      `UserAgent: ${navigator.userAgent}`,
      `Erro: ${error?.message}`,
      `Stack: ${error?.stack}`,
    ].join("\n");
    navigator.clipboard.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, copied } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="text-muted-foreground text-sm">
            O aplicativo encontrou um erro inesperado. Use as opções abaixo para recuperar.
          </p>
          {error && (
            <pre className="text-xs text-left bg-muted p-3 rounded-md overflow-auto max-h-32 border">
              {error.message}
            </pre>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                const base = window.location.protocol === "file:" ? "#/dashboard" : "/dashboard";
                window.location.href = window.location.origin + base;
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              <Home className="h-4 w-4" /> Voltar ao início
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" /> Recarregar
            </button>
            <button
              onClick={this.handleCopy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar relatório"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
