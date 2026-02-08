-- =======================================================
-- TRIGGER: Recalcular totais da comanda automaticamente
-- Modelo A - Banco como fonte da verdade
-- =======================================================

-- 1) Função para recalcular totais de um atendimento
CREATE OR REPLACE FUNCTION public.recalcular_atendimento_totais()
RETURNS TRIGGER AS $$
DECLARE
  v_atendimento_id UUID;
  v_subtotal_servicos NUMERIC(10,2) := 0;
  v_subtotal_produtos NUMERIC(10,2) := 0;
  v_subtotal NUMERIC(10,2) := 0;
  v_desconto NUMERIC(10,2) := 0;
  v_valor_final NUMERIC(10,2) := 0;
BEGIN
  -- Determinar qual atendimento_id usar
  IF TG_OP = 'DELETE' THEN
    v_atendimento_id := OLD.atendimento_id;
  ELSE
    v_atendimento_id := NEW.atendimento_id;
  END IF;

  -- Calcular subtotal de serviços
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal_servicos
  FROM public.atendimento_servicos
  WHERE atendimento_id = v_atendimento_id;

  -- Calcular subtotal de produtos
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal_produtos
  FROM public.atendimento_produtos
  WHERE atendimento_id = v_atendimento_id;

  -- Calcular totais
  v_subtotal := v_subtotal_servicos + v_subtotal_produtos;

  -- Buscar desconto atual do atendimento
  SELECT COALESCE(desconto, 0) INTO v_desconto
  FROM public.atendimentos
  WHERE id = v_atendimento_id;

  -- Calcular valor final
  v_valor_final := GREATEST(0, v_subtotal - v_desconto);

  -- Atualizar o atendimento
  UPDATE public.atendimentos
  SET 
    subtotal = v_subtotal,
    valor_final = v_valor_final,
    updated_at = now()
  WHERE id = v_atendimento_id;

  -- Log para diagnóstico (opcional - pode ser removido em produção)
  RAISE NOTICE '[TRIGGER] Recalculou atendimento %: subtotal=%, desconto=%, valor_final=%', 
    v_atendimento_id, v_subtotal, v_desconto, v_valor_final;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Trigger para atendimento_servicos
DROP TRIGGER IF EXISTS trg_recalcular_totais_servicos ON public.atendimento_servicos;
CREATE TRIGGER trg_recalcular_totais_servicos
AFTER INSERT OR UPDATE OR DELETE ON public.atendimento_servicos
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_atendimento_totais();

-- 3) Trigger para atendimento_produtos
DROP TRIGGER IF EXISTS trg_recalcular_totais_produtos ON public.atendimento_produtos;
CREATE TRIGGER trg_recalcular_totais_produtos
AFTER INSERT OR UPDATE OR DELETE ON public.atendimento_produtos
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_atendimento_totais();

-- 4) Trigger para recalcular quando desconto muda no atendimento
CREATE OR REPLACE FUNCTION public.recalcular_atendimento_ao_mudar_desconto()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o desconto mudou, recalcular valor_final
  IF NEW.desconto IS DISTINCT FROM OLD.desconto THEN
    NEW.valor_final := GREATEST(0, NEW.subtotal - COALESCE(NEW.desconto, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recalcular_desconto ON public.atendimentos;
CREATE TRIGGER trg_recalcular_desconto
BEFORE UPDATE ON public.atendimentos
FOR EACH ROW
WHEN (NEW.desconto IS DISTINCT FROM OLD.desconto)
EXECUTE FUNCTION public.recalcular_atendimento_ao_mudar_desconto();