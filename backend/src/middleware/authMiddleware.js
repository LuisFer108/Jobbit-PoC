const jwt = require("jsonwebtoken");
const pool = require("../db");

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });
    } catch (error) {
        const message = error.name === "TokenExpiredError"
            ? "Tu sesión expiró. Inicia sesión de nuevo"
            : "Sesión inválida. Inicia sesión de nuevo";
        return res.status(401).json({ message });
    }

    try {
        const result = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [decoded.userId]
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({
                message: "La cuenta asociada a esta sesión ya no existe"
            });
        }

        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        return next();
    } catch (error) {
        console.error("Error en authMiddleware:", error);
        return res.status(500).json({ message: "Error al validar la sesión" });
    }
}

module.exports = authenticateToken;