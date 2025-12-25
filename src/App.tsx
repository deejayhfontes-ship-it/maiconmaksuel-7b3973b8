import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="beautypro-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" expand closeButton richColors />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/profissionais" element={<Profissionais />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/atendimentos" element={<Atendimentos />} />
                <Route path="/caixa" element={<Caixa />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/notas-fiscais" element={<NotasFiscais />} />
                <Route path="/nota-fiscal/:id" element={<NotaFiscalDetalhe />} />
                <Route path="/configuracoes/fiscal" element={<ConfiguracoesFiscal />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
