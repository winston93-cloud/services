-- Catálogo operativo (precios reporte contable / POS legacy)
INSERT INTO public.concepto_desayunos (desayuno_nombre, desayuno_abreviatura, costo) VALUES
  ('Desayuno CH', 'dc', 51),
  ('Desayuno GDE', 'dg', 61),
  ('Comida', 'cc', 87),
  ('MEDIA', 'm', 25),
  ('Estancia 5', 'e5', 112),
  ('Estancia 7', 'e7', 132),
  ('Tareas 5', 't5', 50),
  ('Tareas 7', 't7', 70),
  ('Est. Mes 5', 'em5', 106),
  ('Est. Mes 7', 'em7', 119)
ON CONFLICT DO NOTHING;
