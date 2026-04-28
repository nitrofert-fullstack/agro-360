# Entrega formal al operador COA — Agro360

**Sistema:** AgroSantander360 — Caracterización Predial Agropecuaria
**Destinatario:** Operador
**Fecha:** Abril 2026
**Versión:** 1.0

---

## Documentos de la entrega

| # | Documento | Estado | Markdown | Word | PDF |
|---|---|---|---|---|---|
| 1 | Acta de entrega / Documento maestro | Cliente | — | — | — |
| 2 | Alcance funcional final | ✅ | [md](02-alcance-funcional.md) | [docx](docx/02-alcance-funcional.docx) | [pdf](pdf/02-alcance-funcional.pdf) |
| 3 | Manual de usuario | ✅ | [md](03-manual-usuario.md) | [docx](docx/03-manual-usuario.docx) | [pdf](pdf/03-manual-usuario.pdf) |
| 4 | Manual de administrador | ✅ | [md](04-manual-administrador.md) | [docx](docx/04-manual-administrador.docx) | [pdf](pdf/04-manual-administrador.pdf) |
| 5 | Manual técnico y de arquitectura | ✅ | [md](05-manual-tecnico-arquitectura.md) | [docx](docx/05-manual-tecnico-arquitectura.docx) | [pdf](pdf/05-manual-tecnico-arquitectura.pdf) |
| 6 | Guía de instalación / despliegue | ✅ | [md](06-guia-instalacion-despliegue.md) | [docx](docx/06-guia-instalacion-despliegue.docx) | [pdf](pdf/06-guia-instalacion-despliegue.pdf) |
| 7 | Código fuente + README | ✅ | [README](../../README.md) | — | — |
| 8 | Diccionario de datos | ✅ | [md](08-diccionario-datos.md) | [docx](docx/08-diccionario-datos.docx) | [pdf](pdf/08-diccionario-datos.pdf) |
| 9 | Documento de soporte y garantía | Cliente | — | — | — |

Los seis documentos técnicos (2–6, 8) están disponibles en tres formatos:

- **Markdown** (`.md`) — editable en cualquier editor de texto, ideal para control de versiones en Git.
- **Word** (`.docx` en [`docx/`](docx/)) — abre directamente en Microsoft Word u OpenOffice. Generado con Pandoc 3.5.
- **PDF** (`.pdf` en [`pdf/`](pdf/)) — formato final para distribución y archivo. Generado con MS Word desde los DOCX.

Adicionalmente, cada documento tiene una versión **HTML autocontenida** (CSS embebido) en [`html/`](html/) — útil para visualización en navegador o impresión ad-hoc.

### Regenerar los formatos

Si se edita algún Markdown, regenerar DOCX + HTML con:

```bash
pandoc 02-alcance-funcional.md -o docx/02-alcance-funcional.docx
pandoc 02-alcance-funcional.md -o html/02-alcance-funcional.html --standalone --embed-resources --css=style.css
```

Y el PDF desde el DOCX con Microsoft Word (**Archivo → Guardar como → PDF**) o automatizando con PowerShell COM (ver script en el historial del repositorio).

---

## Cómo leer esta documentación

Orden sugerido según el perfil:

- **Jefe / cliente** → 1 (acta), 2 (alcance), 9 (soporte).
- **Usuario final (asesor / agricultor)** → 3 (manual usuario).
- **Administrador operativo** → 4 (manual admin) + 3.
- **Equipo técnico que recibe la operación** → 5 (manual técnico) + 6 (instalación) + 8 (diccionario de datos).
- **Auditor / verificador** → 2 (alcance) + 8 (diccionario de datos).

---

## Convenciones del proyecto

- **Lenguaje de la documentación**: español.
- **Formato**: Markdown (convertible a PDF/Word con Pandoc, Microsoft Word o similares).
- **Código y terminales**: formato *monospace*.
- **Rutas de archivo**: relativas a la raíz del repositorio (`agro-360/`).

---

## Contacto

Para escalamiento técnico, ver el **Documento de Soporte y Garantía** entregado por separado.
