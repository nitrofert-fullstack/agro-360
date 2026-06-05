// Aplica supabase/migrations/20260605_unique_caracterizacion_activa.sql vía pg
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

const sql = readFileSync('supabase/migrations/20260605_unique_caracterizacion_activa.sql', 'utf8')
const stmts = sql
  .split(';')
  .map(s => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim())
  .filter(Boolean)

for (const stmt of stmts) {
  await pool.query(stmt)
  console.log('OK:', stmt.replace(/\s+/g, ' ').slice(0, 90))
}
await pool.end()
