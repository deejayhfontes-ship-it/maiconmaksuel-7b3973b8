import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  showPercentage?: boolean;
  showRemaining?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({ 
  value, 
  max, 
  showPercentage = true, 
  showRemaining = true,
  size = "md",
  className 
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const remaining = max - value;
  
  const getColor = () => {
    if (percentage >= 90) return "bg-success";
    if (percentage >= 70) return "bg-warning";
    return "bg-destructive";
  };
  
  const getIcon = () => {
    if (percentage >= 90) return "🔥";
    if (percentage >= 70) return "⚠️";
    return "🔴";
  };
  
  const getTextColor = () => {
    if (percentage >= 90) return "text-success";
    if (percentage >= 70) return "text-warning";
    return "text-destructive";
  };

  const heights = {
    sm: "h-4",
    md: "h-6",
    lg: "h-8"
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) {
      return `R$ ${(val / 1000).toFixed(1)}k`;
    }
    return `R$ ${val.toFixed(0)}`;
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div className={cn("relative w-full rounded-full bg-muted overflow-hidden", heights[size])}>
        <div 
          className={cn("h-full rounded-full transition-all duration-500 ease-out", getColor())}
          style={{ width: `${percentage}%` }}
        />
        {showPercentage && (
          <span className={cn(
            "absolute inset-0 flex items-center justify-center text-xs font-bold",
            percentage > 50 ? "text-white" : "text-foreground"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      {showRemaining && remaining > 0 && (
        <div className="flex items-center justify-end gap-1 text-xs">
          <span>{getIcon()}</span>
          <span className={getTextColor()}>
            Faltam {formatCurrency(remaining)}
          </span>
        </div>
      )}
    </div>
  );
}

interface DualProgressProps {
  metaServicos: number;
  realizadoServicos: number;
  metaProdutos: number;
  realizadoProdutos: number;
  mesReferencia?: string;
  compact?: boolean;
}

export function DualProgressCard({ 
  metaServicos, 
  realizadoServicos, 
  metaProdutos, 
  realizadoProdutos,
  mesReferencia = "Janeiro/2025",
  compact = false
}: DualProgressProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const percServicos = metaServicos > 0 ? Math.round((realizadoServicos / metaServicos) * 100) : 0;
  const percProdutos = metaProdutos > 0 ? Math.round((realizadoProdutos / metaProdutos) * 100) : 0;
  const perfGeral = Math.round((percServicos + percProdutos) / 2);

  const getPerfColor = () => {
    if (perfGeral >= 80) return "text-success";
    if (perfGeral >= 60) return "text-warning";
    return "text-destructive";
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Serviços</span>
          <ProgressBar 
            value={realizadoServicos} 
            max={metaServicos} 
            showRemaining={false}
            size="sm"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Produtos</span>
          <ProgressBar 
            value={realizadoProdutos} 
            max={metaProdutos} 
            showRemaining={false}
            size="sm"
            className="flex-1"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta Serviços */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">💇</span>
          <span className="text-sm font-medium">META SERVIÇOS - {mesReferencia.toUpperCase()}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Meta: {formatCurrency(metaServicos)} | Atual: {formatCurrency(realizadoServicos)}
        </div>
        <ProgressBar value={realizadoServicos} max={metaServicos} size="md" />
      </div>

      {/* Meta Produtos */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛒</span>
          <span className="text-sm font-medium">META PRODUTOS - {mesReferencia.toUpperCase()}</span>
        </div>
        {metaProdutos > 0 ? (
          <>
            <div className="text-xs text-muted-foreground">
              Meta: {formatCurrency(metaProdutos)} | Atual: {formatCurrency(realizadoProdutos)}
            </div>
            <ProgressBar value={realizadoProdutos} max={metaProdutos} size="md" />
          </>
        ) : (
          <div className="text-xs text-muted-foreground italic">Sem meta definida</div>
        )}
      </div>

      {/* Performance Geral */}
      <div className={cn("text-sm font-medium", getPerfColor())}>
        Performance geral: {perfGeral}%
      </div>
    </div>
  );
}