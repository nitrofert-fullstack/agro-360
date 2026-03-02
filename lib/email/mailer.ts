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

export function buildConfirmacionRegistroEmail({
  nombreCompleto,
  radicadoOficial,
  numeroDocumento,
  nombrePredio,
  appUrl,
}: {
  nombreCompleto: string
  radicadoOficial: string
  numeroDocumento: string
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
      <p style="color:#d1fae5;margin:6px 0 0;font-size:14px">Registro Recibido</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Hola, ${nombreCompleto}</h2>
      <p style="color:#555;font-size:14px;margin:0 0 16px">
        Tu solicitud de caracterización agropecuaria fue recibida exitosamente. Un asesor técnico la revisará en los próximos días.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:20px">
        <p style="color:#15803d;font-weight:600;margin:0 0 8px;font-size:14px">Datos de tu registro:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="color:#6b7280;padding:4px 0;width:160px">Número de radicado:</td>
            <td style="color:#111827;font-weight:600;font-family:monospace">${radicadoOficial}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Número de documento:</td>
            <td style="color:#111827;font-weight:600">${numeroDocumento}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Predio:</td>
            <td style="color:#111827">${nombrePredio}</td>
          </tr>
        </table>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px;margin-bottom:20px">
        <p style="color:#1d4ed8;font-size:13px;margin:0">
          <strong>¿Cómo consultar el estado?</strong><br>
          Puedes revisar el estado de tu solicitud en el portal usando tu número de documento: <strong>${numeroDocumento}</strong>
        </p>
      </div>
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Ver mi solicitud
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Si no realizaste este registro, por favor ignora este correo o contacta a tu asesor agropecuario.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildNuevoRegistroEmail({
  nombreProductor,
  numeroDocumento,
  nombrePredio,
  municipio,
  radicadoOficial,
  fechaRegistro,
  appUrl,
}: {
  nombreProductor: string
  numeroDocumento: string
  nombrePredio: string
  municipio: string
  radicadoOficial: string
  fechaRegistro: string
  appUrl: string
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#1d4ed8;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Agro360</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px">Nuevo Registro — Revisión Pendiente</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Nuevo registro recibido</h2>
      <p style="color:#555;font-size:14px;margin:0 0 16px">
        Se ha registrado una nueva caracterización agropecuaria a través del formulario público. Ingresa al panel de administración para revisarla.
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin-bottom:20px">
        <p style="color:#1e40af;font-weight:600;margin:0 0 8px;font-size:14px">Datos del registro:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="color:#6b7280;padding:4px 0;width:160px">Productor:</td>
            <td style="color:#111827;font-weight:600">${nombreProductor}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Documento:</td>
            <td style="color:#111827">${numeroDocumento}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Predio:</td>
            <td style="color:#111827">${nombrePredio}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Municipio:</td>
            <td style="color:#111827">${municipio}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Radicado:</td>
            <td style="color:#111827;font-family:monospace;font-weight:600">${radicadoOficial}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0">Fecha:</td>
            <td style="color:#111827">${fechaRegistro}</td>
          </tr>
        </table>
      </div>
      <a href="${appUrl}/admin" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Revisar en el panel
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Este mensaje fue generado automáticamente por el sistema Agro360.
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

export function buildEstadoNotificationEmail({
  nombreCompleto,
  radicadoOficial,
  nuevoEstado,
  observaciones,
  appUrl,
}: {
  nombreCompleto: string
  radicadoOficial: string
  nuevoEstado: string
  observaciones?: string | null
  appUrl: string
}): string {
  const estadoConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    // Estados actuales de BD
    iniciado:           { label: 'Iniciado',              color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: '○' },
    revisado:           { label: 'Revisado',              color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '👁' },
    en_estudio_credito: { label: 'En Estudio de Crédito', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', icon: '📋' },
    aprobado:           { label: 'Aprobado',              color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '✓' },
    cancelado:          { label: 'Cancelado',             color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '✗' },
    // Estados legado
    rechazado:    { label: 'Rechazado',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '✗' },
    en_revision:  { label: 'En Revisión',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '👁' },
    sincronizado: { label: 'Sincronizado', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', icon: '↑' },
    pendiente:    { label: 'Pendiente',    color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: '○' },
  }
  const cfg = estadoConfig[nuevoEstado.toLowerCase()] ?? { label: nuevoEstado, color: '#555', bg: '#f9fafb', border: '#e5e7eb', icon: '•' }

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#16a34a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Agro360</h1>
      <p style="color:#d1fae5;margin:6px 0 0;font-size:14px">Actualización de tu caracterización</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Hola, ${nombreCompleto}</h2>
      <p style="color:#555;font-size:14px;margin:0 0 20px">
        El estado de tu caracterización agropecuaria ha sido actualizado.
      </p>
      <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:18px;margin-bottom:20px;text-align:center">
        <p style="color:${cfg.color};font-size:22px;font-weight:700;margin:0">${cfg.icon} ${cfg.label}</p>
        <p style="color:#6b7280;font-size:12px;margin:6px 0 0;font-family:monospace">Radicado: ${radicadoOficial}</p>
      </div>
      ${observaciones ? `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin-bottom:20px">
        <p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 6px">Observaciones del técnico:</p>
        <p style="color:#555;font-size:13px;margin:0">${observaciones}</p>
      </div>` : ''}
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Ver mi solicitud
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Puedes consultar el detalle en el portal usando tu número de documento.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
