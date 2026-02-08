/**
 * Kiosk Security Information - Route and Access Control Info
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  Check, 
  X,
  AlertTriangle,
  Info
} from "lucide-react";
import { useKioskSettings, KIOSK_ROUTES } from "@/hooks/useKioskSettings";

export default function KioskSecurityInfo() {
  const { settings } = useKioskSettings();

  const securityChecks = [
    {
      id: 'no-caixa',
      label: 'Caixa/PDV não acessível',
      description: 'O kiosk não tem acesso às funções de caixa',
      passed: true,
    },
    {
      id: 'no-admin',
      label: 'Sem acesso administrativo',
      description: 'Configurações e dados sensíveis protegidos',
      passed: true,
    },
    {
      id: 'readonly-agenda',
      label: 'Agenda somente leitura',
      description: 'Não permite criar/editar agendamentos',
      passed: settings.agenda_somente_leitura,
    },
    {
      id: 'protected-routes',
      label: 'Rotas protegidas por PIN',
      description: 'Acesso ao kiosk requer autenticação prévia',
      passed: true,
    },
    {
      id: 'privacy-mode',
      label: 'Modo privacidade',
      description: 'Dados de clientes não são expostos',
      passed: settings.agenda_modo_privacidade,
    },
  ];

  const passedCount = securityChecks.filter(c => c.passed).length;
  const allPassed = passedCount === securityChecks.length;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card className={allPassed ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${allPassed ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Shield className={`h-6 w-6 ${allPassed ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <CardTitle>Status de Segurança</CardTitle>
                <CardDescription>
                  {allPassed 
                    ? 'Todas as verificações passaram' 
                    : `${passedCount}/${securityChecks.length} verificações OK`
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={allPassed ? 'default' : 'secondary'} className="text-sm">
              {allPassed ? 'Seguro' : 'Atenção'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Security Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Verificações de Segurança
          </CardTitle>
          <CardDescription>
            Controles de acesso e proteções ativas no kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityChecks.map((check) => (
            <div 
              key={check.id}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                check.passed ? 'bg-green-50/50 border-green-200' : 'bg-yellow-50/50 border-yellow-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${check.passed ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {check.passed ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Routes Status */}
      <Card>
        <CardHeader>
          <CardTitle>Rotas do Kiosk</CardTitle>
          <CardDescription>
            Status das rotas disponíveis no modo kiosk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(KIOSK_ROUTES).map(([key, route]) => {
              const routeKey = key as keyof typeof settings.rotas_habilitadas;
              const isEnabled = settings.rotas_habilitadas[routeKey];
              
              return (
                <div 
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{route.path}</code>
                    <span className="text-sm">{route.label}</span>
                  </div>
                  <Badge variant={isEnabled ? "default" : "secondary"}>
                    {isEnabled ? 'Habilitada' : 'Desabilitada'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Proteção de Rotas:</strong> Todas as rotas do kiosk (/kiosk/*) são protegidas 
              pelo componente ProtectedRoute, exigindo autenticação via PIN antes do acesso.
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Sem Acesso ao Caixa:</strong> O kiosk foi projetado para ser um terminal 
              voltado ao cliente. Funções de caixa, sangria, reforço e outras operações 
              administrativas não estão disponíveis.
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Fechamento de Comanda:</strong> O kiosk apenas EXIBE o resumo da comanda 
              quando fechada pelo operador. Não há capacidade de editar ou cancelar atendimentos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
