-- Enable Realtime for CRUD tables (vales already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.servicos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profissionais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_pagar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_receber;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_fiscais;