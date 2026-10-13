CREATE DATABASE job_portal;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field VARCHAR(150) NOT NULL,
    experience TEXT,
    experience_years INTEGER,
    education TEXT,
    work_preferences TEXT,
    preferred_location VARCHAR(150),
    work_mode VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== CORRECCIÓN: la columna role ya la usa el backend pero faltaba en el esquema =====
-- Si la tabla users ya existe sin la columna, ejecutar:
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'candidate';
-- (candidate | admin)

-- ===== CATÁLOGO DE HABILIDADES (ERD) =====
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(80)
);

-- ===== HABILIDADES DEL PERFIL (ERD, N:M candidato<->skill) =====
CREATE TABLE IF NOT EXISTS profile_skills (
    profile_id INTEGER NOT NULL REFERENCES work_profiles(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level INTEGER,
    PRIMARY KEY (profile_id, skill_id)
);

-- ===== FUENTES DE VACANTES (ERD: dataset vs manual) =====
CREATE TABLE IF NOT EXISTS offer_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('dataset','manual'))
);

-- ===== VACANTES (ERD: job_offers) — ESTA ES LA TABLA PRINCIPAL DE SCRUM-13 =====
CREATE TABLE IF NOT EXISTS job_offers (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES offer_sources(id),
    created_by INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    company VARCHAR(150),
    description TEXT,
    min_experience_years INTEGER,
    location VARCHAR(150),
    work_mode VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== HABILIDADES REQUERIDAS POR CADA VACANTE (ERD, N:M con peso) =====
CREATE TABLE IF NOT EXISTS offer_skills (
    offer_id INTEGER NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    requirement VARCHAR(10) NOT NULL DEFAULT 'must' CHECK (requirement IN ('must','nice')),
    weight INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (offer_id, skill_id)
);

-- ===== RECOMENDACIONES (ERD) — tablas futuras, se crean pero NO se usan en SCRUM-13 =====
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id INTEGER NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    breakdown JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== POSTULACIONES (ERD) — tablas futuras =====
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id INTEGER NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'postulado',
    cover_letter TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_status_history (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    note TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== NOTIFICACIONES Y RECUPERACIÓN DE CONTRASEÑA (ERD, release 2-3) — futuras =====
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);

-- Índice para que el listado de vacantes activas sea rápido (<3 s, criterio SCRUM-13)
CREATE INDEX IF NOT EXISTS idx_job_offers_status_created
    ON job_offers (status, created_at DESC);
