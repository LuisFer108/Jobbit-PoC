const nodemailer = require("nodemailer");

let transporterPromise = null;

// Ethereal: cuenta de pruebas que se crea sola. No envía correos reales.
async function getTransporter() {
    if (!transporterPromise) {
        transporterPromise = nodemailer.createTestAccount().then((account) =>
            nodemailer.createTransport({
                host: account.smtp.host,
                port: account.smtp.port,
                secure: account.smtp.secure,
                auth: {
                    user: account.user,
                    pass: account.pass
                }
            })
        );
    }
    return transporterPromise;
}

async function sendVerificationEmail(to, name, link) {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
        from: '"Jobbit" <no-reply@jobbit.test>',
        to,
        subject: "Confirma tu correo en Jobbit",
        text:
            `Hola ${name},\n\n` +
            `Para activar tu cuenta, abre este enlace (vence en 24 horas):\n${link}\n\n` +
            `Si no creaste esta cuenta, ignora este mensaje.`,
        html:
            `<p>Hola ${name},</p>` +
            `<p>Para activar tu cuenta, haz clic en el siguiente botón. El enlace vence en 24 horas.</p>` +
            `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Confirmar mi correo</a></p>` +
            `<p>Si no creaste esta cuenta, ignora este mensaje.</p>`
    });

    // Solo en desarrollo: enlace para ver el correo en el navegador
    console.log("Correo de verificación (vista previa):", nodemailer.getTestMessageUrl(info));
}

module.exports = { sendVerificationEmail };