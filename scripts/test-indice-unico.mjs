// Test: el índice único parcial rechaza segunda caracterización activa.
// Todo dentro de una transacción con ROLLBACK — no deja datos.
import { readFileSync } from 'fs'
import { Pool } from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/\r/g, '').replace(/^["']|["']$/g, '')])
)
const rawUrl = new URL(env.DATABASE_URL)
rawUrl.searchParams.delete('sslmode')
const pool = new Pool({ connectionString: rawUrl.toString(), ssl: { rejectUnauthorized: false } })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  const { rows: [benef] } = await client.query(
    `INSERT INTO beneficiarios (tipo_documento, numero_documento, nombres, apellidos)
     VALUES ('CC', 'TEST-DUP-000', 'Test', 'Duplicado') RETURNING id`
  )
  const { rows: [v1] } = await client.query(
    `INSERT INTO visitas (fecha_visita, nombre_tecnico) VALUES (CURRENT_DATE, 'Test') RETURNING id`
  )
  const { rows: [v2] } = await client.query(
    `INSERT INTO visitas (fecha_visita, nombre_tecnico) VALUES (CURRENT_DATE, 'Test') RETURNING id`
  )
  const { rows: [predio] } = await client.query(
    `INSERT INTO predios (id_beneficiario, nombre_predio, departamento, municipio) VALUES ($1, 'Test', 'Santander', 'Test') RETURNING id`, [benef.id]
  )
  await client.query(
    `INSERT INTO caracterizaciones (id_beneficiario, id_visita, id_predio, estado) VALUES ($1, $2, $3, 'INICIADO')`, [benef.id, v1.id, predio.id]
  )
  console.log('1ª caracterización INICIADO: OK')
  try {
    await client.query(
      `INSERT INTO caracterizaciones (id_beneficiario, id_visita, id_predio, estado) VALUES ($1, $2, $3, 'INICIADO')`, [benef.id, v2.id, predio.id]
    )
    console.error('FALLO: la 2ª caracterización activa NO fue rechazada')
    process.exitCode = 1
  } catch (e) {
    console.log(`2ª caracterización activa rechazada: ${e.code} ${e.constraint}`)
  }
} finally {
  await client.query('ROLLBACK')
  client.release()
  await pool.end()
  console.log('ROLLBACK — sin datos residuales')
}
