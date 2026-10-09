-- Mejoras > Mediciones: nuevos campos (2026-10-09)
alter table body_measurements add column if not exists muscle_mass numeric;
alter table body_measurements add column if not exists lean_mass numeric;
alter table body_measurements add column if not exists metabolic_age numeric;
alter table body_measurements add column if not exists comentario text;
