# 24-manual-soporte

> Convertido desde `24-manual-soporte.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**24. Manual de Soporte**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Canales de Soporte

|  |  |  |
| --- | --- | --- |
| **Canal** | **Tipo** | **Tiempo de respuesta** |
| Canal operativo acordado con el operador | Soporte técnico y funcional | Según SLA (ver doc de garantía) |
| Vercel Dashboard | Logs de aplicación en tiempo real | Inmediato (self-service) |
| Supabase Dashboard | BD, auth, storage, logs | Inmediato (self-service) |

# 2. Problemas Comunes y Soluciones

|  |  |  |
| --- | --- | --- |
| **Síntoma** | **Causa probable** | **Solución** |
| No se puede iniciar sesión | JWT expirado o URL de Supabase incorrecta | Verificar env vars SUPABASE\_URL y ANON\_KEY en Vercel |
| Formulario falla con error 500 | SERVICE\_ROLE\_KEY faltante o incorrecta | Verificar SUPABASE\_SERVICE\_ROLE\_KEY en Vercel env vars |
| No llegan correos | SMTP mal configurado | Verificar SMTP\_HOST, SMTP\_USER, SMTP\_PASS. Revisar spam del destinatario. |
| Error de RLS / acceso denegado | Política RLS incorrecta o rol del usuario incorrecto | Verificar profiles.rol del usuario. Revisar políticas en Supabase Dashboard. |
| Build falla en Vercel | Error TypeScript o dependencia faltante | Revisar logs del build en Vercel → Deployments |
| Supabase error 42P17 | Recursión infinita en políticas RLS | Ejecutar migración 20260427\_rls\_completo.sql |
| refresh\_token\_not\_found en logs | Token de refresh inválido o expirado | El sistema hace signOut automático. El usuario debe re-autenticarse. |

# 3. Escalación

* Nivel 1: Administrador del sistema (operador), para problemas de configuración y usuarios.
* Nivel 2: Equipo de desarrollo, para bugs, migraciones y cambios de código.
* Nivel 3: Supabase Support / Vercel Support, para incidentes de infraestructura.

# 4. Monitoreo Recomendado

* Vercel Dashboard → Logs: revisar errores 5xx diariamente.
* Supabase Dashboard → Logs: queries lentas o errores de BD.
* Endpoint /api/health: monitorear con herramienta de uptime (UptimeRobot, etc.).
