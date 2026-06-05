// Limpieza única: eliminar caracterizaciones duplicadas por beneficiario.
// Conserva la copia MÁS ANTIGUA (created_at asc) en estados bloqueantes; borra el resto
// junto con sus visitas, predios y sub-tablas del predio.
// Uso: node scripts/limpiar-duplicados.mjs           (dry-run, no borra nada)
//      node scripts/limpiar-duplicados.mjs --ejecutar (borra de verdad)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const EJECUTAR = process.argv.includes('--ejecutar')
const ESTADOS_BLOQUEANTES = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'SINCRONIZADO', 'EN_REVISION', 'RECHAZADO']

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
    .in('estado', ESTADOS_BLOQUEANTES)
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

const aBorrar = []
const keptPorBenef = new Map()
for (const [benefId, arr] of byBenef) {
  if (arr.length < 2) continue
  keptPorBenef.set(benefId, arr[0]) // más antigua se conserva
  aBorrar.push(...arr.slice(1))
}

console.log(`Beneficiarios con duplicados activos: ${keptPorBenef.size}`)
console.log(`Caracterizaciones a borrar: ${aBorrar.length}`)
if (aBorrar.length === 0) process.exit(0)

if (!EJECUTAR) {
  for (const c of aBorrar) console.log(`  [dry-run] borraría carac ${c.id} (${c.created_at}) visita:${c.id_visita} predio:${c.id_predio}`)
  console.log('\nDry-run. Ejecuta con --ejecutar para borrar.')
  process.exit(0)
}

let ok = 0, fail = 0
for (const c of aBorrar) {
  try {
    // 1. Repuntar beneficiarios.id_visita si apunta a la visita que se borra
    const kept = keptPorBenef.get(c.id_beneficiario)
    await supabase.from('beneficiarios')
      .update({ id_visita: kept.id_visita })
      .eq('id', c.id_beneficiario)
      .eq('id_visita', c.id_visita)

    // 2. Caracterización (FK a visita y predio — va primero)
    let r = await supabase.from('caracterizaciones').delete().eq('id', c.id)
    if (r.error) throw new Error(`caracterizaciones: ${r.error.message}`)

    // 3. Sub-tablas del predio duplicado
    if (c.id_predio) {
      for (const tabla of ['abastecimiento_agua', 'riesgos_predio', 'caracterizacion_predio', 'area_productiva']) {
        r = await supabase.from(tabla).delete().eq('id_predio', c.id_predio)
        if (r.error) throw new Error(`${tabla}: ${r.error.message}`)
      }
      r = await supabase.from('predios').delete().eq('id', c.id_predio)
      if (r.error) throw new Error(`predios: ${r.error.message}`)
    }

    // 4. Visita duplicada
    if (c.id_visita) {
      r = await supabase.from('visitas').delete().eq('id', c.id_visita)
      if (r.error) throw new Error(`visitas: ${r.error.message}`)
    }

    ok++
    console.log(`✔ borrada carac ${c.id}`)
  } catch (e) {
    fail++
    console.error(`✘ carac ${c.id}: ${e.message}`)
  }
}
console.log(`\nResultado: ${ok} borradas, ${fail} fallidas`)
