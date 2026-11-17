-- Migración 003: Tablas y columnas para notificaciones y recuperación de contraseña

-- 1. Tabla de password_resets
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets (token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- 2. Tabla de notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL DEFAULT 'job_match',
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas para asociar con la vacante y compatibilidad
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS offer_id INTEGER REFERENCES job_offers(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_offer ON notifications (user_id, offer_id);
