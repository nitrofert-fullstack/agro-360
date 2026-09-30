# 10-modelo-entidad-relacion

> Convertido desde `10-modelo-entidad-relacion.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**10. Modelo Entidad-Relación**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Entidades y Relaciones

El modelo de datos de Agro360 consta de 11 tablas en el schema public de PostgreSQL. Todas las tablas tienen RLS habilitado.

|  |  |  |
| --- | --- | --- |
| **Entidad** | **Descripción** | **Relaciones clave** |
| visitas | Encabezado de la visita técnica | 1 visita → N beneficiarios, N predios, N caracterizaciones |
| beneficiarios | Datos del productor rural | N:1 visita, 1 → N predios, 1 → N caracterizaciones, 1 → N informacion\_financiera |
| predios | Datos del predio agropecuario | N:1 beneficiario, 1 → 1 caracterizacion\_predio, 1 → N abastecimiento\_agua, 1 → N riesgos\_predio, 1 → N area\_productiva |
| caracterizacion\_predio | Datos técnicos del predio | 1:1 predio (FK unique) |
| abastecimiento\_agua | Fuentes de agua del predio | N:1 predio |
| riesgos\_predio | Riesgos identificados en el predio | N:1 predio |
| area\_productiva | Sistemas productivos del predio | N:1 predio |
| informacion\_financiera | Datos financieros del beneficiario | N:1 beneficiario |
| caracterizaciones | Registro maestro de la caracterización | N:1 visita, N:1 beneficiario, N:1 predio |
| profiles | Perfil del usuario del sistema | 1:1 auth.users (Supabase) |
| invitations | Invitaciones de registro por correo | Standalone, referencia a auth.users |

# Diagrama Textual ER

visitas ──────────────────────────────────────────────┐
│ │
│ (1:N) │
▼ │
beneficiarios ──── informacion\_financiera │
│ │
│ (1:N) │
▼ ▼
predios ──── caracterizacion\_predio caracterizaciones
├──── abastecimiento\_agua
├──── riesgos\_predio
└──── area\_productiva
profiles ──── auth.users (Supabase Auth)
invitations (standalone)
