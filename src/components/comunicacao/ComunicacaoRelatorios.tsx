import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star
} from "lucide-react";
import { ComunicacaoEstatisticas, ComunicacaoAvaliacao } from "@/hooks/useComunicacao";

interface Props {
  estatisticas: ComunicacaoEstatisticas | null;
  avaliacoes: ComunicacaoAvaliacao[];
}

export function ComunicacaoRelatorios({ estatisticas, avaliacoes }: Props) {
  const stats = estatisticas || {
    mensagens_enviadas: 0,
    mensagens_entregues: 0,
    mensagens_lidas: 0,
    mensagens_respondidas: 0,
    agendamentos_confirmados: 0,
    agendamentos_cancelados: 0,
    falhas_envio: 0
  };

  // Calcular métricas
  const taxaEntrega = stats.mensagens_enviadas > 0 
    ? ((stats.mensagens_entregues / stats.mensagens_enviadas) * 100).toFixed(1) 
    : "0";
  
  const taxaLeitura = stats.mensagens_entregues > 0 
    ? ((stats.mensagens_lidas / stats.mensagens_entregues) * 100).toFixed(1) 
    : "0";
  
  const taxaResposta = stats.mensagens_enviadas > 0 
    ? ((stats.mensagens_respondidas / stats.mensagens_enviadas) * 100).toFixed(1) 
    : "0";

  const taxaConfirmacao = (stats.agendamentos_confirmados + stats.agendamentos_cancelados) > 0
    ? ((stats.agendamentos_confirmados / (stats.agendamentos_confirmados + stats.agendamentos_cancelados)) * 100).toFixed(1)
    : "0";

  // Calcular média de avaliações
  const mediaAvaliacoes = avaliacoes.length > 0
    ? (avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length).toFixed(1)
    : "0";

  const distribuicaoNotas = [1, 2, 3, 4, 5].map(nota => ({
    nota,
    quantidade: avaliacoes.filter(a => a.nota === nota).length,
    percentual: avaliacoes.length > 0 
      ? ((avaliacoes.filter(a => a.nota === nota).length / avaliacoes.length) * 100).toFixed(0)
      : "0"
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios de Comunicação
          </h3>
          <p className="text-sm text-muted-foreground">
            Análise de performance das mensagens enviadas
          </p>
        </div>
      </div>

      {/* Taxas Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{taxaEntrega}%</div>
              <p className="text-sm text-muted-foreground mt-1">Taxa de Entrega</p>
              <Progress value={parseFloat(taxaEntrega)} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{taxaLeitura}%</div>
              <p className="text-sm text-muted-foreground mt-1">Taxa de Leitura</p>
              <Progress value={parseFloat(taxaLeitura)} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{taxaResposta}%</div>
              <p className="text-sm text-muted-foreground mt-1">Taxa de Resposta</p>
              <Progress value={parseFloat(taxaResposta)} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{taxaConfirmacao}%</div>
              <p className="text-sm text-muted-foreground mt-1">Taxa de Confirmação</p>
              <Progress value={parseFloat(taxaConfirmacao)} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.mensagens_enviadas}</div>
                <p className="text-xs text-muted-foreground">Mensagens Enviadas</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.agendamentos_confirmados}</div>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{stats.agendamentos_cancelados}</div>
                <p className="text-xs text-muted-foreground">Cancelados</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{stats.falhas_envio}</div>
                <p className="text-xs text-muted-foreground">Falhas de Envio</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Avaliações dos Clientes
          </CardTitle>
          <CardDescription>
            Feedback recebido através das mensagens pós-atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500">{mediaAvaliacoes}</div>
              <div className="flex items-center justify-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${
                      star <= Math.round(parseFloat(mediaAvaliacoes)) 
                        ? 'text-amber-500 fill-amber-500' 
                        : 'text-muted'
                    }`} 
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{avaliacoes.length} avaliações</p>
            </div>

            <div className="flex-1 space-y-2">
              {distribuicaoNotas.reverse().map(({ nota, quantidade, percentual }) => (
                <div key={nota} className="flex items-center gap-2">
                  <span className="text-xs w-4">{nota}</span>
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <Progress value={parseFloat(percentual)} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8">{quantidade}</span>
                </div>
              ))}
            </div>
          </div>

          {avaliacoes.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma avaliação recebida ainda</p>
              <p className="text-xs">Ative o lembrete de pós-atendimento para coletar feedback</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horários com maior engajamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Melhores Horários para Envio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <div className="text-lg font-bold text-green-700 dark:text-green-400">9h - 11h</div>
              <p className="text-xs text-muted-foreground">Maior taxa de abertura</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <div className="text-lg font-bold text-blue-700 dark:text-blue-400">14h - 16h</div>
              <p className="text-xs text-muted-foreground">Maior taxa de resposta</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
              <div className="text-lg font-bold text-purple-700 dark:text-purple-400">18h - 20h</div>
              <p className="text-xs text-muted-foreground">Maior engajamento geral</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
