-- ============================================================
-- Migration: whatsapp_logs
-- Tabela de log completo de envios via WhatsApp (Z-API)
-- Criada em: 2026-04-04
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  -- Identificação
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id      UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  cliente_id          UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone            TEXT NOT NULL,

  -- Tipo e classificação
  tipo_mensagem       TEXT NOT NULL DEFAULT 'confirmacao',
  -- Valores: confirmacao | lembrete | avaliacao | manual | chatbot | reenvio

  -- Status do envio
  status_envio        TEXT NOT NULL DEFAULT 'pendente',
  -- Valores: pendente | processando | enviado | falha | cancelado

  -- Status da interação do cliente
  status_interacao    TEXT NOT NULL DEFAULT 'sem_interacao',
  -- Valores: sem_interacao | entregue | lido | respondeu | confirmado | recusado | erro

  -- Conteúdo da mensagem
  mensagem_texto      TEXT,

  -- Dados do provider (Z-API)
  provider            TEXT NOT NULL DEFAULT 'z-api',
  provider_message_id TEXT,
  payload_retorno     JSONB,

  -- Controle de tentativas
  tentativa_numero    INTEGER NOT NULL DEFAULT 1,
  erro_detalhado      TEXT,

  -- Rastreabilidade
  enviado_em          TIMESTAMPTZ,
  enviado_por_manual  BOOLEAN NOT NULL DEFAULT FALSE,
  origem_fluxo        TEXT NOT NULL DEFAULT 'automatico',
  -- Valores: automatico | manual | webhook | n8n | reenvio_manual
  usuario_reenvio_id  UUID,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_agendamento
  ON public.whatsapp_logs(agendamento_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status_envio
  ON public.whatsapp_logs(status_envio);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at
  ON public.whatsapp_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tipo
  ON public.whatsapp_logs(tipo_mensagem);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_cliente
  ON public.whatsapp_logs(cliente_id);

-- ============================================================
-- Trigger: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_whatsapp_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_logs_updated_at ON public.whatsapp_logs;
CREATE TRIGGER trg_whatsapp_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_logs
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_logs_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Leitura: usuários autenticados
DROP POLICY IF EXISTS "whatsapp_logs_select" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_select"
  ON public.whatsapp_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserção: autenticados e service_role (n8n usa service_role)
DROP POLICY IF EXISTS "whatsapp_logs_insert" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_insert"
  ON public.whatsapp_logs FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Update: autenticados (para reenvio manual) e service_role
DROP POLICY IF EXISTS "whatsapp_logs_update" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_update"
  ON public.whatsapp_logs FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- Comentário na tabela
-- ============================================================
COMMENT ON TABLE public.whatsapp_logs IS
  'Log completo de todos os envios via WhatsApp (Z-API). 
   Alimentado automaticamente pelo n8n (via webhook do Supabase) e manualmente pelo painel administrativo.';
