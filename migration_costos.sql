
CREATE TABLE IF NOT EXISTS public.catalogo_costos (
    medida TEXT PRIMARY KEY,
    costo_kg NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.catalogo_costos ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow select on catalogo_costos for authenticated users"
ON public.catalogo_costos
FOR SELECT
TO authenticated
USING (true);

-- Limpiar tabla por si acaso
DELETE FROM public.catalogo_costos;

-- Insertar nuevos
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X1.6', 2.3);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X2.5', 2.69);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('30X2', 2.37);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('94X2', 2.38);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X2', 2.7);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('250X1.6', 2.4);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('200X1.6', 2.44);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('224X1.6', 2.44);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('54X2', 2.44);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('224X2', 2.77);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('264X2', 2.72);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('200X2', 2.84);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X2', 2.85);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X1.6', 2.63);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('34X2', 2.71);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X2', 2.78);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X2.9', 2.47);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X2', 2.69);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X2.9', 3.4);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X2.5', 2.76);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X1.9', 2.93);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('160X2.5', 2.88);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('40X2', 2.8);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('286X2', 2.81);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('60X2', 2.82);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('30X1.6', 2.24);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('224X2.5', 2.66);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X2.3', 2.96);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X2.3', 2.98);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X2.5', 3.39);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('250X2', 2.99);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('264X2.9', 2.92);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('89X2', 1.61);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X2.5', 2.82);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X2.4', 2.72);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X2.4', 2.72);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('64X2.5', 2.7);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('45X2.5', 2.65);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('264X2.5', 2.68);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('60X2.5', 2.68);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('44X2.9', 3.18);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X2.9', 2.91);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('250X2.5', 2.71);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('200X2.5', 2.71);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('200X1.9', 2.95);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('44X2', 2.72);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('44X1.9', 3.24);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('264X1.9', 3.19);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('284X1.9', 3.23);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('360X2', 2.76);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('64X2.3', 2.96);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('250X1.9', 2.93);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X1.5', 2.83);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X1.5', 2.86);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('64X2', 3.01);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X1.9', 2.93);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('250X1.8', 2.93);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('200X1.8', 2.93);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('64X2.4', 2.95);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('170X1.8', 2.96);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('45X1.6', 2.98);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('100X2.3', 2.99);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('264X2.3', 3.0);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('64X1.9', 3.19);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('60X1.9', 3.21);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('600X1.9', 3.26);
INSERT INTO public.catalogo_costos (medida, costo_kg) VALUES ('304X1.9', 3.98);
