-- ═══════════════════════════════════════════════════════════════
-- CONTABILIDAD COMPLETA — Schema Supabase
-- Correr en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Catálogo de cuentas
CREATE TABLE IF NOT EXISTS conta_cuentas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  codigo      TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ACTIVO','PASIVO','CAPITAL','INGRESO','GASTO')),
  subtipo     TEXT DEFAULT '',
  activa      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, codigo)
);

-- 2. Asientos del Libro Diario
CREATE TABLE IF NOT EXISTS conta_asientos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha           DATE NOT NULL,
  descripcion     TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'GENERAL' CHECK (tipo IN ('VENTA','COMPRA','GENERAL')),
  no_factura      TEXT,
  nit             TEXT,
  total           NUMERIC(14,2),
  base_imponible  NUMERIC(14,2),
  iva             NUMERIC(14,2),
  estado          TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','ANULADO')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Líneas de cada asiento (partidas dobles)
CREATE TABLE IF NOT EXISTS conta_lineas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asiento_id  UUID REFERENCES conta_asientos(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cuenta_id   UUID REFERENCES conta_cuentas(id) NOT NULL,
  debito      NUMERIC(14,2) NOT NULL DEFAULT 0,
  credito     NUMERIC(14,2) NOT NULL DEFAULT 0,
  orden       INTEGER DEFAULT 0
);

-- 4. Bitácora de auditoría
CREATE TABLE IF NOT EXISTS conta_auditoria (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asiento_id            UUID,
  asiento_descripcion   TEXT,
  accion                TEXT NOT NULL CHECK (accion IN ('EDITADO','ELIMINADO','ANULADO')),
  datos_antes           JSONB,
  datos_despues         JSONB,
  fecha                 TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE conta_cuentas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_asientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_lineas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conta_cuentas_own"   ON conta_cuentas   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conta_asientos_own"  ON conta_asientos  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conta_lineas_own"    ON conta_lineas    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conta_auditoria_own" ON conta_auditoria FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
