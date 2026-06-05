// Diagnóstico: detectar caracterizaciones duplicadas por beneficiario
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/\r/g, '').replace(/^["']|["']$/g, '')])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Paginación: supabase-js limita a 1000 filas por petición
const caracs = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('caracterizaciones')
    .select('id, id_beneficiario, id_visita, id_predio, estado, created_at')
    .order('created_at', { ascending: true })
    .range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  caracs.push(...data)
  if (data.length < 1000) break
}

const byBenef = new Map()
for (const c of caracs) {
  if (!byBenef.has(c.id_beneficiario)) byBenef.set(c.id_beneficiario, [])
  byBenef.get(c.id_beneficiario).push(c)
}

const dups = [...byBenef.entries()].filter(([, arr]) => arr.length > 1)
console.log(`Total caracterizaciones: ${caracs.length}`)
console.log(`Beneficiarios con >1 caracterización: ${dups.length}`)

if (dups.length > 0) {
  const benefIds = dups.map(([id]) => id)
  const { data: benefs } = await supabase
    .from('beneficiarios')
    .select('id, numero_documento, correo, nombres, apellidos')
    .in('id', benefIds)
  const benefMap = new Map((benefs ?? []).map(b => [b.id, b]))

  for (const [benefId, arr] of dups) {
    const b = benefMap.get(benefId)
    console.log(`\n— ${b?.nombres} ${b?.apellidos} | doc:${b?.numero_documento} | ${b?.correo}`)
    for (const c of arr) {
      console.log(`   carac ${c.id} | estado:${c.estado} | visita:${c.id_visita} | predio:${c.id_predio} | ${c.created_at}`)
    }
  }
}
