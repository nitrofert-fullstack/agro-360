import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn('[Mailer] Variables SMTP no configuradas. Los emails no se enviarán.')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const transporter = createTransporter()
  if (!transporter) return false

  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  try {
    await transporter.sendMail({ from, to, subject, html })
    console.log(`[Mailer] Email enviado a ${to}: ${subject}`)
    return true
  } catch (err) {
    console.error('[Mailer] Error enviando email:', err)
    return false
  }
}

export function buildCredentialsEmail({
  nombreCompleto,
  email,
  password,
  rol,
  appUrl,
}: {
  nombreCompleto: string
  email: string
  password: string
  rol: string
  appUrl: string
}): string {
  const rolLabel = rol === 'admin' ? 'Administrador' : rol === 'asesor' ? 'Asesor' : 'Beneficiario'
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#16a34a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Agro360</h1>
      <p style="color:#d1fae5;margin:6px 0 0;font-size:14px">Sistema de Caracterización Agropecuaria</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Bienvenido(a), ${nombreCompleto || email}</h2>
      <p style="color:#555;font-size:14px;margin:0 0 20px">
        Se ha creado tu cuenta como <strong>${rolLabel}</strong> en Agro360.
        A continuación encuentras tus credenciales de acceso:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#6b7280;padding:6px 0;width:110px">Correo:</td>
            <td style="color:#111827;font-weight:600">${email}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:6px 0">Contraseña:</td>
            <td style="color:#111827;font-weight:600;font-family:monospace">${password}</td>
          </tr>
        </table>
      </div>
      <p style="color:#555;font-size:13px;margin:0 0 20px">
        Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.
      </p>
      <a href="${appUrl}/auth/login" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Iniciar Sesión
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Si no esperabas este correo, por favor ignóralo o contacta al administrador.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildSyncNotificationEmail({
  nombreCompleto,
  email,
  password,
  radicadoOficial,
  nombrePredio,
  appUrl,
}: {
  nombreCompleto: string
  email: string
  password: string
  radicadoOficial: string
  nombrePredio: string
  appUrl: string
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#16a34a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Agro360</h1>
      <p style="color:#d1fae5;margin:6px 0 0;font-size:14px">Caracterización Agropecuaria Registrada</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Hola, ${nombreCompleto || email}</h2>
      <p style="color:#555;font-size:14px;margin:0 0 16px">
        Tu caracterización agropecuaria ha sido registrada exitosamente en el sistema.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:20px">
        <p style="color:#15803d;font-weight:600;margin:0 0 8px;font-size:14px">Datos del registro:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="color:#6b7280;padding:4px 0;width:130px">Radicado:</td>
            <td style="color:#111827;font-weight:600;font-family:monospace">${radicadoOficial}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Predio:</td>
            <td style="color:#111827">${nombrePredio}</td>
          </tr>
        </table>
      </div>
      <p style="color:#555;font-size:14px;margin:0 0 8px">
        Puedes acceder al portal para ver los detalles de tu registro y terrenos:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#6b7280;padding:6px 0;width:110px">Correo:</td>
            <td style="color:#111827;font-weight:600">${email}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:6px 0">Contraseña:</td>
            <td style="color:#111827;font-weight:600;font-family:monospace">${password}</td>
          </tr>
        </table>
      </div>
      <a href="${appUrl}/auth/login" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Ver mi registro
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Si no reconoces este registro, por favor contacta a tu asesor agropecuario.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
