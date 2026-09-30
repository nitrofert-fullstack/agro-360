# 17-plan-de-pruebas

> Convertido desde `17-plan-de-pruebas.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**17. Plan de Pruebas**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Estrategia de Pruebas

Las pruebas de Agro360 se realizaron en tres niveles: unitarias (componentes críticos), integración (endpoints API con BD real) y funcionales/UAT (flujos completos de usuario).

# 2. Tipos de Prueba

|  |  |  |  |
| --- | --- | --- | --- |
| **Tipo** | **Herramienta** | **Alcance** | **Responsable** |
| Unitaria | Manual / TypeScript typecheck | Validaciones Zod, funciones utilitarias | Desarrollador |
| Integración | Pruebas manuales con Postman / curl | Endpoints API, autenticación, BD | Desarrollador |
| Funcional / UAT | Prueba manual en navegador | Flujos completos por rol | Desarrollador + Operador |
| Seguridad | Revisión manual de código + RLS tests | Políticas RLS, JWT, HTTPS | Desarrollador |
| Rendimiento | Chrome DevTools / Vercel Analytics | Tiempos de carga, Core Web Vitals | Desarrollador |
| Compatibilidad | Prueba en múltiples navegadores | Chrome, Firefox, Edge, Safari, móvil | Desarrollador |

# 3. Criterios de Aceptación

* Todos los flujos críticos completan sin errores en Chrome y Firefox.
* El formulario genera radicado oficial en < 5 segundos.
* Los correos transaccionales se entregan en < 2 minutos.
* La autenticación funciona correctamente para los 4 roles.
* Las políticas RLS impiden acceso cruzado entre usuarios.
* El build de producción pasa sin errores de TypeScript ni ESLint.

# 4. Ambiente de Pruebas

|  |  |  |
| --- | --- | --- |
| **Ambiente** | **URL** | **Datos** |
| Staging | Preview de Vercel (PR) | Datos de prueba en Supabase dev |
| Producción | Dominio final | Datos reales post go-live |
