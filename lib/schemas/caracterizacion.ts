import { z } from 'zod'

/** Solo dígitos, longitud 6-12. */
export const numeroDocumentoSchema = z
  .string({ required_error: 'El número de documento es requerido' })
  .trim()
  .regex(/^\d{6,12}$/, 'El número de documento debe contener solo dígitos (6 a 12 caracteres)')

/** Formato de email válido. */
export const emailSchema = z
  .string()
  .trim()
  .email('El correo electrónico no tiene un formato válido')

/** Nombre completo: 3-120 caracteres, sin < ni > (anti-inyección HTML). */
export const nombreCompletoSchema = z
  .string({ required_error: 'El nombre es requerido' })
  .trim()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(120, 'El nombre no puede superar los 120 caracteres')
  .refine((v) => !/[<>]/.test(v), 'El nombre contiene caracteres no permitidos (< o >)')

/** Nombre/apellido individual: máximo 80 caracteres. */
export const nombreParteSchema = z
  .string()
  .trim()
  .max(80, 'Cada nombre/apellido no puede superar los 80 caracteres')

/**
 * Elimina los caracteres < y > de un texto antes de inyectarlo en HTML
 * (p.ej. plantillas de correo). Devuelve cadena vacía si la entrada es nula.
 */
export function stripAngleBrackets(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[<>]/g, '')
}

/** Esquema para el registro de agricultor (POST /api/registro-agricultor). */
export const registroAgricultorSchema = z.object({
  email: emailSchema,
  nombre_completo: nombreCompletoSchema,
  numero_documento: numeroDocumentoSchema,
})
