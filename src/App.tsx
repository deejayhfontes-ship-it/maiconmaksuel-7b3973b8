// Sistema de Gestão de Salão - v1.0

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { isDesktopWrapper } from "@/lib/desktopDetection";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PinAuthProvider } from "@/contexts/PinAuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { SalonSettingsProvider } from "@/contexts/SalonSettingsContext";
import { NetworkDebugProvider } from "@/contexts/NetworkDebugContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { UpdateNotification } from "@/components/UpdateNotification";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Profissionais from "./pages/Profissionais";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Agenda from "./pages/Agenda";
import Atendimentos from "./pages/Atendimentos";
import Caixa from "./pages/Caixa";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import NotFound from "./pages/NotFound";
import NotasFiscais from "./pages/NotasFiscais";
import NotaFiscalDetalhe from "./pages/NotaFiscalDetalhe";
import ConfiguracoesFiscal from "./pages/ConfiguracoesFiscal";
import ConfiguracoesWhatsApp from "./pages/ConfiguracoesWhatsApp";
import ConfirmacoesWhatsApp from "./pages/ConfirmacoesWhatsApp";
import ConfirmarAgendamento from "./pages/ConfirmarAgendamento";
import GestaoRH from "./pages/GestaoRH";
import PontoEletronico from "./pages/PontoEletronico";
import Vales from "./pages/Vales";
import ProfissionalDetalhe from "./pages/ProfissionalDetalhe";
import FechamentoSemanal from "./pages/FechamentoSemanal";
import MetasSalao from "./pages/MetasSalao";
import RelatorioCompleto from "./pages/RelatorioCompleto";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesNotificacoes from "./pages/ConfiguracoesNotificacoes";
import ConfiguracoesIntegracoes from "./pages/ConfiguracoesIntegracoes";
import ConfiguracoesCaixaPDV from "./pages/ConfiguracoesCaixaPDV";
import ConfiguracoesTaxaFalta from "./pages/ConfiguracoesTaxaFalta";
import TabletCliente from "./pages/TabletCliente";
import Perfil from "./pages/Perfil";
import CaixaExtrato from "./pages/CaixaExtrato";
import CaixaComandas from "./pages/CaixaComandas";
import CaixaDividas from "./pages/CaixaDividas";
import CaixaGorjetas from "./pages/CaixaGorjetas";
import CaixaHistorico from "./pages/CaixaHistorico";
import CaixaGaveta from "./pages/CaixaGaveta";
import CaixaFechar from "./pages/CaixaFechar";
import CaixaPDV from "./pages/CaixaPDV";
import MapaSistema from "./pages/MapaSistema";
import KioskHome from "./pages/KioskHome";
import KioskLayout from "./components/layout/KioskLayout";
import ColaboradorLayout from "./components/layout/ColaboradorLayout";
import AtendimentoWhatsApp from "./pages/AtendimentoWhatsApp";
import WhatsAppModule from "./pages/WhatsAppModule";
import CentroAlertas from "./pages/CentroAlertas";

const queryClient = new QueryClient();
const RouterComponent = isDesktopWrapper() ? HashRouter : BrowserRouter;

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="beautypro-theme">
      <OfflineProvider>
        <NetworkDebugProvider>
          <PinAuthProvider>
            <SalonSettingsProvider>
              <TooltipProvider>
            <UpdateNotification />
            <Toaster />
            <Sonner position="top-right" expand closeButton richColors />
            <RouterComponent>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/confirmar/:token" element={<ConfirmarAgendamento />} />
              <Route path="/ponto" element={<PontoEletronico />} />
              <Route path="/tablet/cliente" element={<TabletCliente />} />
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/profissionais" element={<Profissionais />} />
                <Route path="/profissionais/:id" element={<ProfissionalDetalhe />} />
                <Route path="/profissional/:id" element={<ProfissionalDetalhe />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/atendimentos" element={<Atendimentos />} />
                <Route path="/caixa" element={<Caixa />} />
                <Route path="/caixa/extrato" element={<CaixaExtrato />} />
                <Route path="/caixa/comandas" element={<CaixaComandas />} />
                <Route path="/caixa/dividas" element={<CaixaDividas />} />
                <Route path="/caixa/gorjetas" element={<CaixaGorjetas />} />
                <Route path="/caixa/historico" element={<CaixaHistorico />} />
                <Route path="/caixa/gaveta" element={<CaixaGaveta />} />
                <Route path="/caixa/fechar" element={<CaixaFechar />} />
                <Route path="/caixa/pdv" element={<CaixaPDV />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/financeiro/vales" element={<Vales />} />
                <Route path="/financeiro/fechamento-semanal" element={<FechamentoSemanal />} />
                <Route path="/financeiro/dividas" element={<CaixaDividas />} />
                <Route path="/financeiro/cheques" element={<Caixa />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/relatorios/completo" element={<RelatorioCompleto />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/notas-fiscais" element={<NotasFiscais />} />
                <Route path="/nota-fiscal/:id" element={<NotaFiscalDetalhe />} />
                <Route path="/configuracoes/fiscal" element={<ConfiguracoesFiscal />} />
                <Route path="/configuracoes/whatsapp" element={<ConfiguracoesWhatsApp />} />
                <Route path="/configuracoes/metas" element={<MetasSalao />} />
                <Route path="/confirmacoes-whatsapp" element={<WhatsAppModule />} />
                <Route path="/whatsapp" element={<WhatsAppModule />} />
                <Route path="/atendimento-whatsapp" element={<AtendimentoWhatsApp />} />
                <Route path="/gestao-rh" element={<GestaoRH />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/configuracoes/alertas" element={<CentroAlertas />} />
                <Route path="/configuracoes/notificacoes" element={<ConfiguracoesNotificacoes />} />
                <Route path="/configuracoes/integracoes" element={<ConfiguracoesIntegracoes />} />
                <Route path="/configuracoes/caixa-pdv" element={<ConfiguracoesCaixaPDV />} />
                <Route path="/configuracoes/taxa-falta" element={<ConfiguracoesTaxaFalta />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/mapa-sistema" element={<MapaSistema />} />
                <Route path="/vales" element={<Vales />} />
                <Route path="/metas-salao" element={<MetasSalao />} />
                <Route path="/fechamento-semanal" element={<FechamentoSemanal />} />
                <Route path="/relatorio-completo" element={<RelatorioCompleto />} />
              </Route>
              
              {/* Kiosk routes - Minimal client-facing display */}
              {/* Only: idle/comanda screen + ponto */}
              <Route element={
                <ProtectedRoute>
                  <KioskLayout />
                </ProtectedRoute>
              }>
                <Route path="/kiosk" element={<KioskHome />} />
                <Route path="/kiosk/ponto" element={<PontoEletronico />} />
              </Route>

              {/* Colaborador Agenda routes - Ultra-restricted read-only */}
              <Route element={
                <ProtectedRoute>
                  <ColaboradorLayout />
                </ProtectedRoute>
              }>
                <Route path="/colaborador/agenda" element={<Agenda />} />
              </Route>
              
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouterComponent>
            </TooltipProvider>
          </SalonSettingsProvider>
        </PinAuthProvider>
      </NetworkDebugProvider>
    </OfflineProvider>
   </ThemeProvider>
</QueryClientProvider>
  </ErrorBoundary>
);

export default App;
