-- Agrega educación al perfil laboral sin eliminar datos existentes.
ALTER TABLE work_profiles
ADD COLUMN IF NOT EXISTS education TEXT;
