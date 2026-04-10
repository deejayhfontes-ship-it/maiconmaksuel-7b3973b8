-- Add pin_ponto column to funcionarios table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='pin_ponto') THEN
        ALTER TABLE public.funcionarios ADD COLUMN pin_ponto character varying(4);
    END IF;
END $$;

-- Add pin_ponto column to profissionais table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profissionais' AND column_name='pin_ponto') THEN
        ALTER TABLE public.profissionais ADD COLUMN pin_ponto character varying(4);
    END IF;
END $$;

-- Optional constraint to restrict pin_ponto to only digits (although frontend will handle it mostly)
-- ALTER TABLE public.funcionarios ADD CONSTRAINT ck_funcionarios_pin_ponto_numeric CHECK (pin_ponto ~ '^[0-9]{4}$');
