/**
 * Permission catalog and helper functions for granular access control
 */

import { PinRole } from '@/contexts/PinAuthContext';

// Permission key format: module.action
export const PERMISSIONS_CATALOG = {
  // Agenda
  'agenda.view': { label: 'Visualizar agenda', module: 'Agenda' },
  'agenda.create': { label: 'Criar agendamento', module: 'Agenda' },
  'agenda.edit': { label: 'Editar agendamento', module: 'Agenda' },
  'agenda.delete': { label: 'Cancelar/Remover agendamento', module: 'Agenda' },
  'agenda.encaixe': { label: 'Botão de encaixe', module: 'Agenda' },
  
  // Atendimentos
  'atendimentos.view': { label: 'Visualizar', module: 'Atendimentos' },
  'atendimentos.create': { label: 'Criar', module: 'Atendimentos' },
  'atendimentos.edit': { label: 'Editar', module: 'Atendimentos' },
  'atendimentos.finalizar': { label: 'Finalizar', module: 'Atendimentos' },
  
  // Clientes
  'clientes.view': { label: 'Visualizar', module: 'Clientes' },
  'clientes.create': { label: 'Criar', module: 'Clientes' },
  'clientes.edit': { label: 'Editar', module: 'Clientes' },
  'clientes.delete': { label: 'Remover', module: 'Clientes' },
  
  // Profissionais
  'profissionais.view': { label: 'Visualizar', module: 'Profissionais' },
  'profissionais.create': { label: 'Criar', module: 'Profissionais' },
  'profissionais.edit': { label: 'Editar', module: 'Profissionais' },
  'profissionais.delete': { label: 'Remover', module: 'Profissionais' },
  
  // Produtos/Estoque
  'produtos.view': { label: 'Visualizar', module: 'Produtos/Estoque' },
  'produtos.create': { label: 'Criar', module: 'Produtos/Estoque' },
  'produtos.edit': { label: 'Editar', module: 'Produtos/Estoque' },
  'produtos.delete': { label: 'Remover', module: 'Produtos/Estoque' },
  
  // Serviços
  'servicos.view': { label: 'Visualizar', module: 'Serviços' },
  'servicos.create': { label: 'Criar', module: 'Serviços' },
  'servicos.edit': { label: 'Editar', module: 'Serviços' },
  'servicos.delete': { label: 'Remover', module: 'Serviços' },
  
  // Caixa/PDV
  'caixa.view': { label: 'Visualizar', module: 'Caixa/PDV' },
  'caixa.abrir_comanda': { label: 'Abrir comanda', module: 'Caixa/PDV' },
  'caixa.lancar_itens': { label: 'Lançar itens', module: 'Caixa/PDV' },
  'caixa.fechar_comanda': { label: 'Fechar comanda', module: 'Caixa/PDV' },
  'caixa.sangria_reforco': { label: 'Sangria/Reforço', module: 'Caixa/PDV' },
  
  // Financeiro
  'financeiro.view': { label: 'Visualizar', module: 'Financeiro' },
  'financeiro.fechamento_semanal': { label: 'Fechamento semanal', module: 'Financeiro' },
  'financeiro.dividas': { label: 'Dívidas/Crediário', module: 'Financeiro' },
  'financeiro.cheques': { label: 'Cheques', module: 'Financeiro' },
  'financeiro.vales': { label: 'Vales (criar/editar/remover)', module: 'Financeiro' },
  
  // Notas Fiscais
  'notas_fiscais.view': { label: 'Visualizar', module: 'Notas Fiscais' },
  'notas_fiscais.emitir': { label: 'Emitir/Consultar', module: 'Notas Fiscais' },
  
  // Relatórios
  'relatorios.view': { label: 'Visualizar', module: 'Relatórios' },
  'relatorios.exportar': { label: 'Exportar PDF', module: 'Relatórios' },
  'relatorios.completo': { label: 'Relatório completo', module: 'Relatórios' },
  
  // WhatsApp
  'whatsapp.view': { label: 'Visualizar', module: 'WhatsApp' },
  'whatsapp.edit_config': { label: 'Editar configurações', module: 'WhatsApp' },
  'whatsapp.campanhas': { label: 'Criar campanhas', module: 'WhatsApp' },
  'whatsapp.avaliacoes': { label: 'Avaliações', module: 'WhatsApp' },
  
  // Gestão RH
  'rh.view': { label: 'Visualizar', module: 'Gestão RH' },
  'rh.edit': { label: 'Editar', module: 'Gestão RH' },
  
  // Configurações
  'configuracoes.view': { label: 'Visualizar', module: 'Configurações' },
  'configuracoes.edit': { label: 'Editar sistema/tema/backup', module: 'Configurações' },
  
  // Usuários
  'usuarios.view': { label: 'Visualizar lista', module: 'Usuários' },
  'usuarios.create': { label: 'Criar usuário', module: 'Usuários' },
  'usuarios.edit': { label: 'Editar usuário', module: 'Usuários' },
  'usuarios.delete': { label: 'Remover usuário', module: 'Usuários' },
  'usuarios.permissoes': { label: 'Alterar permissões', module: 'Usuários' },
  
  // Dashboard
  'dashboard.faturamento_mensal': { label: 'Ver faturamento mensal', module: 'Dashboard' },
  'dashboard.kpis': { label: 'Ver KPIs financeiros', module: 'Dashboard' },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS_CATALOG;

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<PinRole, PermissionKey[]> = {
  admin: Object.keys(PERMISSIONS_CATALOG) as PermissionKey[],
  
  notebook: [
    'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.delete', 'agenda.encaixe',
    'atendimentos.view', 'atendimentos.create', 'atendimentos.edit', 'atendimentos.finalizar',
    'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'profissionais.view',
    'produtos.view',
    'servicos.view',
  ],
  
  kiosk: [
    'agenda.view',
    'caixa.view', 'caixa.abrir_comanda', 'caixa.lancar_itens', 'caixa.fechar_comanda',
  ],
  
  colaborador_agenda: [
    'agenda.view',
  ],
};

// Get permissions grouped by module
export function getPermissionsByModule(): Record<string, { key: PermissionKey; label: string }[]> {
  const grouped: Record<string, { key: PermissionKey; label: string }[]> = {};
  
  for (const [key, value] of Object.entries(PERMISSIONS_CATALOG)) {
    if (!grouped[value.module]) {
      grouped[value.module] = [];
    }
    grouped[value.module].push({
      key: key as PermissionKey,
      label: value.label,
    });
  }
  
  return grouped;
}

// Get all module names
export function getModuleNames(): string[] {
  const modules = new Set<string>();
  for (const value of Object.values(PERMISSIONS_CATALOG)) {
    modules.add(value.module);
  }
  return Array.from(modules);
}
