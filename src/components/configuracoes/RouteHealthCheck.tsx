/**
 * Route Health Check Panel
 * Displays route verification results in the settings
 */

import { useRouteHealthCheck, RouteInfo } from '@/hooks/useRouteHealthCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Route,
  Shield,
  Laptop,
  Monitor,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export default function RouteHealthCheck() {
  const report = useRouteHealthCheck();

  const copyReport = () => {
    const text = [
      '=== ROUTE HEALTH CHECK REPORT ===',
      `Total Routes: ${report.totalRoutes}`,
      `Protected: ${report.protectedRoutes}`,
      `Public: ${report.publicRoutes}`,
      `Dynamic: ${report.dynamicRoutes}`,
      `With Issues: ${report.routesWithIssues}`,
      '',
      '--- Summary ---',
      ...report.summary,
      '',
      '--- Routes ---',
      ...report.routes.map(r => 
        `${r.path} | Roles: ${r.allowedRoles.join(',')} | Issues: ${r.issues.join('; ') || 'OK'}`
      ),
    ].join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Relatório copiado para a área de transferência');
  };

  const getStatusIcon = (route: RouteInfo) => {
    if (route.issues.length > 0) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  const getRoleBadge = (role: string, hasAccess: boolean) => {
    const config = {
      admin: { icon: Shield, label: 'Admin' },
      notebook: { icon: Laptop, label: 'Notebook' },
      kiosk: { icon: Monitor, label: 'Kiosk' },
    }[role] || { icon: Shield, label: role };

    const Icon = config.icon;

    return (
      <Badge
        key={role}
        variant={hasAccess ? 'default' : 'outline'}
        className={`text-xs ${!hasAccess ? 'opacity-30' : ''}`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Route className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Verificação de Rotas</CardTitle>
                <CardDescription>
                  Status das rotas vs permissões do sistema
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyReport}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Relatório
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{report.totalRoutes}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-success">{report.protectedRoutes}</div>
              <div className="text-xs text-muted-foreground">Protegidas</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{report.publicRoutes}</div>
              <div className="text-xs text-muted-foreground">Públicas</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">{report.dynamicRoutes}</div>
              <div className="text-xs text-muted-foreground">Dinâmicas</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${report.routesWithIssues > 0 ? 'text-destructive' : 'text-success'}`}>
                {report.routesWithIssues}
              </div>
              <div className="text-xs text-muted-foreground">Com Problemas</div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              {report.routesWithIssues === 0 ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              Resumo
            </h4>
            <ul className="space-y-1 text-sm">
              {report.summary.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item}</li>
              ))}
            </ul>
          </div>

          {/* Routes Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Status</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Problemas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.routes.map((route, i) => (
                  <TableRow key={i} className={route.issues.length > 0 ? 'bg-destructive/5' : ''}>
                    <TableCell>{getStatusIcon(route)}</TableCell>
                    <TableCell className="font-mono text-sm">{route.path}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {route.isDynamic ? 'Dinâmica' : 'Estática'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadge('admin', route.allowedRoles.includes('admin'))}
                        {getRoleBadge('notebook', route.allowedRoles.includes('notebook'))}
                        {getRoleBadge('kiosk', route.allowedRoles.includes('kiosk'))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      {route.issues.length > 0 ? (
                        <span className="text-destructive">{route.issues.join('; ')}</span>
                      ) : (
                        <span className="text-success">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
