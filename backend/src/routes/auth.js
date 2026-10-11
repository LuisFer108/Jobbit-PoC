const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

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
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                message: "El correo ya está registrado"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, passwordHash]
        );

        return res.status(201).json({
            message: "Usuario creado correctamente",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error al registrar el usuario"
        });
    }
});


// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
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

        // Verificar si tiene perfil laboral
        const profileResult = await pool.query(
            "SELECT id FROM work_profiles WHERE user_id = $1",
            [user.id]
        );

        const token = createToken(user);

        return res.json({
            message: "Inicio de sesión exitoso",
            token,
            hasProfile: profileResult.rows.length>0, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role:user.role
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error al iniciar sesión"
        });
    }
});

// Devuelve el usuario autenticado y su rol actual desde la base de datos.
const authenticateToken = require("../middleware/authMiddleware");

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
