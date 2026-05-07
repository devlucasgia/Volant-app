
-- Cars table
CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand text,
  model text,
  plate text,
  initial_km numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cars: owner can select" ON public.cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cars: owner can insert" ON public.cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cars: owner can update" ON public.cars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Cars: owner can delete" ON public.cars FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER cars_set_updated_at
BEFORE UPDATE ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_cars_user ON public.cars(user_id);

-- Migrate existing car data from profiles
INSERT INTO public.cars (user_id, brand, model, plate, initial_km, is_active)
SELECT id, car_brand, car_model, car_plate, COALESCE(car_initial_km, 0), true
FROM public.profiles
WHERE car_brand IS NOT NULL OR car_model IS NOT NULL OR car_plate IS NOT NULL OR COALESCE(car_initial_km, 0) > 0;
