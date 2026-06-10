-- ── LIBRO DE VENTAS SAT (por empresa, mes, año) ────────────────────────────
CREATE TABLE conta_libro_ventas (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   uuid REFERENCES conta_empresas(id),
  user_id      uuid REFERENCES auth.users(id),
  ano          integer NOT NULL,
  mes          integer NOT NULL,
  meta_nombre  text DEFAULT '',
  meta_nit     text DEFAULT '',
  no           integer,
  fecha        text,
  tipo_dte     text,
  serie        text,
  numero       text,
  nit          text,
  cliente      text,
  estado       text,
  servicios    numeric DEFAULT 0,
  iva          numeric DEFAULT 0,
  total        numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE conta_libro_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "libro_ventas_owner" ON conta_libro_ventas
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── LIBRO DE COMPRAS SAT (por empresa, mes, año) ───────────────────────────
CREATE TABLE conta_libro_compras (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   uuid REFERENCES conta_empresas(id),
  user_id      uuid REFERENCES auth.users(id),
  ano          integer NOT NULL,
  mes          integer NOT NULL,
  meta_nombre  text DEFAULT '',
  meta_nit     text DEFAULT '',
  no           integer,
  fecha        text,
  tipo_dte     text,
  serie        text,
  numero       text,
  nit          text,
  proveedor    text,
  estado       text,
  combustibles numeric DEFAULT 0,
  compras      numeric DEFAULT 0,
  iva          numeric DEFAULT 0,
  idp          numeric DEFAULT 0,
  total        numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE conta_libro_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "libro_compras_owner" ON conta_libro_compras
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
