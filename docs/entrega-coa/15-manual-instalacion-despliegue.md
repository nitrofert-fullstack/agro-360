# 15-manual-instalacion-despliegue

> Convertido desde `15-manual-instalacion-despliegue.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**15. Manual de Instalación y Despliegue**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Resumen

Agro360 se despliega en dos servicios externos: Supabase (BD + Auth + Storage) y Vercel (hosting).

# 2. Configurar Supabase

* Crear cuenta en supabase.com → New Project → nombre: agro360-prod.
* Esperar 2-3 min a que se aprovisione.
* Settings → API: copiar Project URL, anon key y service\_role key.
* SQL Editor: ejecutar los scripts en el orden indicado en el doc 14.
* Storage: los buckets se crean automáticamente al primer envío.
* Auth → JWT Expiry: configurar 18000 segundos (5 horas).
* Auth → Providers → Email: habilitar, Confirm Email: ON.
* Auth → URL Configuration: Site URL y Redirect URLs con el dominio de producción.

# 3. Configurar Vercel

* Subir código a repositorio GitHub privado.
* Vercel → New Project → Import Git Repository → seleccionar repo.
* Framework Preset: Next.js (se detecta automáticamente).
* Install Command: pnpm install.
* Environment Variables: agregar todas las del doc 16.
* Deploy → esperar 3-5 min → URL publicada.
* Settings → Domains → agregar dominio personalizado.
* Actualizar NEXT\_PUBLIC\_APP\_URL y Supabase Auth URLs con el dominio final.

# 4. Primer Admin

Registrarse normalmente y luego desde Supabase SQL Editor:

UPDATE profiles SET rol = 'admin' WHERE email = 'admin@tudominio.com';

# 5. Verificación Post-Despliegue

|  |  |  |
| --- | --- | --- |
| **Verificación** | **Cómo probar** | **Resultado esperado** |
| Health check | GET /api/health | { status: 'ok' } |
| Login | Iniciar sesión como admin | Redirige a /admin |
| Crear caracterización | Llenar /formulario y enviar | Radicado generado, correo enviado |
| Dashboard admin | /admin | Estadísticas y lista de usuarios |
| Correo transaccional | Invitar usuario → revisar bandeja | Correo con credenciales recibido |
