import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, ArrowLeft, Calendar, Users, Scissors, Package, 
  DollarSign, FileText, Settings, BarChart3, Clock, CreditCard,
  UserCog, Building2, Bell, MessageSquare, Database, Shield,
  Smartphone, Receipt, Wallet, TrendingUp, ClipboardList
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function MapaSistema() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    const canvas = await html2canvas(contentRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("mapa-sistema-salao.pdf");
  };

  const modulos = [
    {
      titulo: "Agenda",
      icone: Calendar,
      cor: "bg-blue-500",
      rota: "/agenda",
      descricao: "Gerenciamento de agendamentos",
      funcionalidades: [
        "Visualização por dia/semana/mês",
        "Agendamento por profissional",
        "Confirmação via WhatsApp",
        "Bloqueio de horários",
        "Lembretes automáticos"
      ]
    },
    {
      titulo: "Atendimentos",
      icone: Scissors,
      cor: "bg-purple-500",
      rota: "/atendimentos",
      descricao: "Gestão de comandas e serviços",
      funcionalidades: [
        "Abertura de comandas",
        "Adição de serviços e produtos",
        "Desconto e gorjetas",
        "Fechamento com múltiplas formas",
        "Integração com tablet cliente"
      ]
    },
    {
      titulo: "Clientes",
      icone: Users,
      cor: "bg-green-500",
      rota: "/clientes",
      descricao: "Cadastro e histórico de clientes",
      funcionalidades: [
        "Cadastro completo com foto",
        "Histórico de visitas",
        "Crédito/Fiado",
        "Aniversariantes",
        "Preferências e observações"
      ]
    },
    {
      titulo: "Profissionais",
      icone: UserCog,
      cor: "bg-amber-500",
      rota: "/profissionais",
      descricao: "Gestão da equipe",
      funcionalidades: [
        "Cadastro com comissões",
        "Metas individuais",
        "Vales e adiantamentos",
        "Histórico de atendimentos",
        "Fechamento semanal"
      ]
    },
    {
      titulo: "Serviços",
      icone: ClipboardList,
      cor: "bg-pink-500",
      rota: "/servicos",
      descricao: "Catálogo de serviços",
      funcionalidades: [
        "Categorias de serviços",
        "Preços e duração",
        "Comissão por serviço",
        "Serviços ativos/inativos"
      ]
    },
    {
      titulo: "Produtos",
      icone: Package,
      cor: "bg-orange-500",
      rota: "/produtos",
      descricao: "Estoque e vendas",
      funcionalidades: [
        "Controle de estoque",
        "Estoque mínimo",
        "Categorias",
        "Código de barras",
        "Preço custo/venda"
      ]
    },
    {
      titulo: "Caixa",
      icone: DollarSign,
      cor: "bg-emerald-500",
      rota: "/caixa",
      descricao: "Controle financeiro diário",
      funcionalidades: [
        "Abertura/fechamento de caixa",
        "Comandas abertas",
        "Sangrias e suprimentos",
        "Cheques a compensar",
        "Gorjetas",
        "Dívidas/Fiado"
      ]
    },
    {
      titulo: "Financeiro",
      icone: Wallet,
      cor: "bg-cyan-500",
      rota: "/financeiro",
      descricao: "Contas a pagar e receber",
      funcionalidades: [
        "Contas a pagar",
        "Contas a receber",
        "Despesas por categoria",
        "Fluxo de caixa"
      ]
    },
    {
      titulo: "Notas Fiscais",
      icone: FileText,
      cor: "bg-slate-500",
      rota: "/notas-fiscais",
      descricao: "Emissão de NF-e e NFC-e",
      funcionalidades: [
        "Emissão automática",
        "NF-e e NFC-e",
        "Envio por email/SMS",
        "Consulta e cancelamento"
      ]
    },
    {
      titulo: "Relatórios",
      icone: BarChart3,
      cor: "bg-indigo-500",
      rota: "/relatorios",
      descricao: "Análises e estatísticas",
      funcionalidades: [
        "Faturamento por período",
        "Desempenho profissionais",
        "Produtos mais vendidos",
        "Serviços mais realizados",
        "Relatório completo"
      ]
    },
    {
      titulo: "Metas",
      icone: TrendingUp,
      cor: "bg-rose-500",
      rota: "/metas",
      descricao: "Gestão de metas do salão",
      funcionalidades: [
        "Metas mensais/semanais",
        "Acompanhamento em tempo real",
        "Alertas de progresso",
        "Metas por profissional"
      ]
    },
    {
      titulo: "RH",
      icone: Building2,
      cor: "bg-violet-500",
      rota: "/rh",
      descricao: "Gestão de funcionários",
      funcionalidades: [
        "Cadastro CLT/PJ",
        "Folha de pagamento",
        "Férias e 13º",
        "Documentos",
        "Ocorrências"
      ]
    },
    {
      titulo: "Ponto Eletrônico",
      icone: Clock,
      cor: "bg-teal-500",
      rota: "/ponto",
      descricao: "Controle de jornada",
      funcionalidades: [
        "Registro de ponto",
        "Horas trabalhadas",
        "Faltas e atrasos",
        "Relatório mensal"
      ]
    },
    {
      titulo: "Fechamento Semanal",
      icone: Receipt,
      cor: "bg-lime-600",
      rota: "/fechamento-semanal",
      descricao: "Acerto com profissionais",
      funcionalidades: [
        "Resumo semanal",
        "Comissões calculadas",
        "Vales descontados",
        "Confirmação de pagamento"
      ]
    },
    {
      titulo: "Configurações",
      icone: Settings,
      cor: "bg-gray-500",
      rota: "/configuracoes",
      descricao: "Configurações do sistema",
      funcionalidades: [
        "Dados da empresa",
        "Fiscal (NF-e/NFC-e)",
        "WhatsApp",
        "Notificações",
        "Backup/Restauração",
        "Integrações"
      ]
    },
    {
      titulo: "Tablet Cliente",
      icone: Smartphone,
      cor: "bg-fuchsia-500",
      rota: "/tablet",
      descricao: "Tela para cliente",
      funcionalidades: [
        "Exibição de comanda",
        "Forma de pagamento",
        "Ponto de profissionais",
        "Logo animada"
      ]
    },
  ];

  const tabelasBanco = [
    { nome: "agendamentos", descricao: "Horários agendados" },
    { nome: "atendimentos", descricao: "Comandas/atendimentos" },
    { nome: "atendimento_servicos", descricao: "Serviços por comanda" },
    { nome: "atendimento_produtos", descricao: "Produtos por comanda" },
    { nome: "clientes", descricao: "Cadastro de clientes" },
    { nome: "profissionais", descricao: "Profissionais do salão" },
    { nome: "servicos", descricao: "Catálogo de serviços" },
    { nome: "produtos", descricao: "Estoque de produtos" },
    { nome: "caixa", descricao: "Caixas abertos/fechados" },
    { nome: "caixa_movimentacoes", descricao: "Movimentações do caixa" },
    { nome: "pagamentos", descricao: "Pagamentos recebidos" },
    { nome: "dividas", descricao: "Fiado/crédito clientes" },
    { nome: "gorjetas", descricao: "Gorjetas profissionais" },
    { nome: "vales", descricao: "Vales/adiantamentos" },
    { nome: "cheques", descricao: "Cheques a compensar" },
    { nome: "notas_fiscais", descricao: "Notas fiscais emitidas" },
    { nome: "funcionarios", descricao: "Funcionários CLT/PJ" },
    { nome: "ponto_registros", descricao: "Registros de ponto" },
    { nome: "fechamentos_semanais", descricao: "Fechamentos semanais" },
    { nome: "metas", descricao: "Metas do salão" },
    { nome: "configuracoes_fiscal", descricao: "Config. fiscal" },
    { nome: "configuracoes_whatsapp", descricao: "Config. WhatsApp" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mapa do Sistema</h1>
        </div>
        <Button onClick={handleExportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Conteúdo exportável */}
      <div ref={contentRef} className="p-8 bg-white">
        {/* Cabeçalho do documento */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Gestão para Salão de Beleza
          </h1>
          <p className="text-gray-600">Mapa completo de funcionalidades e módulos</p>
          <p className="text-sm text-gray-400 mt-1">
            Gerado em: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <Separator className="my-6" />

        {/* Módulos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Módulos do Sistema
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((modulo) => {
              const Icone = modulo.icone;
              return (
                <Card key={modulo.rota} className="border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${modulo.cor} text-white`}>
                        <Icone className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{modulo.titulo}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {modulo.rota}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {modulo.descricao}
                    </p>
                    <ul className="text-xs space-y-1">
                      {modulo.funcionalidades.map((func, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {func}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Banco de Dados */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6" />
            Estrutura do Banco de Dados
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tabelasBanco.map((tabela) => (
              <div 
                key={tabela.nome}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <p className="font-mono text-sm font-medium text-primary">
                  {tabela.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tabela.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Integrações */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Integrações e Recursos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Confirmação de agendamentos</li>
                  <li>• Lembretes automáticos</li>
                  <li>• Envio de recibos</li>
                  <li>• Cobrança de dívidas</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• NF-e (Nota Fiscal Eletrônica)</li>
                  <li>• NFC-e (Cupom Fiscal)</li>
                  <li>• Emissão automática</li>
                  <li>• Envio por email</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-purple-500" />
                  Tablet Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Tela de espera com logo</li>
                  <li>• Exibição da comanda</li>
                  <li>• Forma de pagamento</li>
                  <li>• Ponto eletrônico</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Fluxo Principal */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Fluxo Principal de Atendimento
          </h2>
          
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
            {[
              { texto: "Agendamento", cor: "bg-blue-500" },
              { texto: "→", cor: "" },
              { texto: "Check-in Cliente", cor: "bg-green-500" },
              { texto: "→", cor: "" },
              { texto: "Abrir Comanda", cor: "bg-purple-500" },
              { texto: "→", cor: "" },
              { texto: "Adicionar Serviços", cor: "bg-pink-500" },
              { texto: "→", cor: "" },
              { texto: "Fechar Comanda", cor: "bg-amber-500" },
              { texto: "→", cor: "" },
              { texto: "Pagamento", cor: "bg-emerald-500" },
              { texto: "→", cor: "" },
              { texto: "Nota Fiscal", cor: "bg-slate-500" },
            ].map((item, idx) => (
              item.cor ? (
                <Badge key={idx} className={`${item.cor} text-white px-3 py-1`}>
                  {item.texto}
                </Badge>
              ) : (
                <span key={idx} className="text-gray-400 font-bold">{item.texto}</span>
              )
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-400">
          <p>Sistema de Gestão para Salão de Beleza - Maicon Maksuel Concept</p>
          <p>Desenvolvido com Lovable</p>
        </div>
      </div>
    </div>
  );
}
