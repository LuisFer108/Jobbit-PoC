const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { sendVerificationEmail } = require("../utils/mailer")
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos" }
});

function createToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurado");
    }

    return jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );
}

// REGISTRO
router.post("/register", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: "Ingresa un correo válido" });
        }
        if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres"
            });
        }
        if (password.length > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 caracteres"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = $1",
            [email]
        );
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "El correo ya está registrado" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Token de verificación: el enlace lleva el token, la base guarda solo su hash
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationHash = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const result = await pool.query(
            `INSERT INTO users
                (name, email, password_hash, verification_token_hash, verification_expires)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
             RETURNING id, name, email`,
            [name, email, passwordHash, verificationHash]
        );

        const user = result.rows[0];

        const link = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

        let emailSent = true;
        try {
            await sendVerificationEmail(user.email, user.name, link);
        } catch (mailError) {
            emailSent = false;
            console.error("Error al enviar el correo de verificación:", mailError);
        }

        return res.status(201).json({
            message: emailSent
                ? "Cuenta creada. Revisa tu correo para confirmarla"
                : "Cuenta creada, pero no pudimos enviar el correo de confirmación. Intenta reenviarlo más tarde",
            emailSent,
            user
        });

    } catch (error) {
        // 23505 = violación de UNIQUE (dos registros simultáneos con el mismo correo)
        if (error.code === "23505") {
            return res.status(409).json({ message: "El correo ya está registrado" });
        }
        console.error("Error en registro:", error);
        return res.status(500).json({ message: "Error al crear la cuenta" });
    }
});


// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                message: "Ingresa tu correo y tu contraseña"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }
                if (!user.email_verified) {
            return res.status(403).json({
                message: "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        // Verificar si tiene perfil laboral
        const profileResult = await pool.query(
            "SELECT id FROM work_profiles WHERE user_id = $1",
            [user.id]
        );

        const token = createToken(user);

        return res.json({
            message: "Inicio de sesión exitoso",
            token,
            hasProfile: profileResult.rows.length > 0,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Error en login:", error);

        return res.status(500).json({
            message: "Error al iniciar sesión"
        });
    }
});
// VERIFICAR CORREO
router.get("/verify-email", async (req, res) => {
    try {
        const token = String(req.query.token || "");

        if (!token) {
            return res.status(400).json({ message: "El enlace de verificación no es válido" });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const result = await pool.query(
            `SELECT id, email_verified, verification_expires
             FROM users
             WHERE verification_token_hash = $1`,
            [tokenHash]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({
                message: "El enlace de verificación no es válido o ya fue usado"
            });
        }

        if (user.verification_expires && user.verification_expires < new Date()) {
            return res.status(400).json({
                message: "El enlace venció. Solicita uno nuevo"
            });
        }

        await pool.query(
            `UPDATE users
             SET email_verified = TRUE,
                 verification_token_hash = NULL,
                 verification_expires = NULL
             WHERE id = $1`,
            [user.id]
        );

        return res.json({ message: "Correo verificado correctamente. Ya puedes iniciar sesión" });

    } catch (error) {
        console.error("Error en verify-email:", error);
        return res.status(500).json({ message: "Error al verificar el correo" });
    }
});

// Devuelve el usuario autenticado y su rol actual desde la base de datos.
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "La cuenta asociada a esta sesión ya no existe"
            });
        }

        return res.json({ user: result.rows[0] });
    } catch (error) {
        console.error("Error al consultar el usuario autenticado:", error);
        return res.status(500).json({
            message: "Error al consultar la sesión"
        });
    }
});

module.exports = router;