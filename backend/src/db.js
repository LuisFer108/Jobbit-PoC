const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Verificación segura y no invasiva de tablas para recuperación de contraseña y notificaciones
async function ensureTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(40) DEFAULT 'job_match',
                message TEXT,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS offer_id INTEGER REFERENCES job_offers(id) ON DELETE CASCADE;
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

            ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
    } catch {
        // En caso de que no haya conexión inicial aún, fallará silenciosamente hasta que conecte
    }
}

ensureTables();

module.exports = pool;

