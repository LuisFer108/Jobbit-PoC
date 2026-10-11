const jwt = require("jsonwebtoken");
const pool =require("../db")

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    const [scheme, token] = authHeader ? authHeader.split(" ") : [];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            message: "Debes iniciar sesion"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const result = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [decoded.userId]
        );

        const user = result.rows[0];
        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        return next();

    } catch (error) {
        return res.status(403).json({
            message: "Token inválido"
        });
    }
}

module.exports = authenticateToken;
