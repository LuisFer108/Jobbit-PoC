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

async function sendPasswordResetEmail(to, name, link) {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
        from: '"Jobbit" <no-reply@jobbit.test>',
        to,
        subject: "Restablece tu contraseña en Jobbit",
        text:
            `Hola ${name},\n\n` +
            `Recibimos una solicitud para restablecer tu contraseña en Jobbit.\n` +
            `Para crear una nueva contraseña, abre el siguiente enlace (vence en 1 hora):\n${link}\n\n` +
            `Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.`,
        html:
            `<div style="font-family: Arial, sans-serif; color: #16182e; max-width: 580px; margin: 0 auto; padding: 20px;">` +
            `<h2 style="color: #16182e; margin-bottom: 8px;">Restablecer tu contraseña</h2>` +
            `<p>Hola <strong>${name}</strong>,</p>` +
            `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Jobbit</strong>.</p>` +
            `<p>Haz clic en el siguiente botón para definir una nueva contraseña. El enlace es válido durante <strong>1 hora</strong>:</p>` +
            `<p style="margin: 24px 0;">` +
            `<a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Restablecer mi contraseña</a>` +
            `</p>` +
            `<p style="font-size: 0.9em; color: #6b7280;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${link}">${link}</a></p>` +
            `<hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;" />` +
            `<p style="font-size: 0.85em; color: #9ca3af;">Si no solicitaste este cambio, no te preocupes: tu contraseña actual sigue siendo segura y puedes ignorar este correo.</p>` +
            `</div>`
    });

    console.log("Correo de restablecimiento de contraseña (vista previa):", nodemailer.getTestMessageUrl(info));
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };