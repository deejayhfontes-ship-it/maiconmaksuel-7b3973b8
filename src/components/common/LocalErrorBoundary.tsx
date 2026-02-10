import React, { Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[LocalErrorBoundary][${this.props.context || "unknown"}]`, {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h3 className="font-semibold text-lg">
            {this.props.fallbackMessage || "Ocorreu um erro ao carregar este módulo"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {this.state.error?.message}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            Recarregar módulo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
