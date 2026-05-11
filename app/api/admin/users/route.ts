import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const callerProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (callerProfile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden listar usuarios' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit   = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100)
    const search  = (searchParams.get('search') || '').trim().slice(0, 100)
    const asesoresOnly = searchParams.get('asesores_only') === 'true'
    const skip    = (page - 1) * limit

    if (asesoresOnly) {
      // Listado compacto de asesores/admins activos (para el dropdown de asignación)
      const asesores = await prisma.profiles.findMany({
        where: { rol: 'asesor', activo: true },
        select: { id: true, nombre_completo: true },
        orderBy: { nombre_completo: 'asc' },
        take: 200,
      })
      return NextResponse.json({ asesores })
    }

    // Build where clause
    const where: Prisma.profilesWhereInput = {}

    if (search) {
      where.OR = [
        { nombre_completo: { contains: search, mode: 'insensitive' } },
        { email:           { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.profiles.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id:              true,
          email:           true,
          nombre_completo: true,
          telefono:        true,
          rol:             true,
          activo:          true,
          created_at:      true,
        },
      }),
      prisma.profiles.count({ where }),
    ])

    // Invitaciones (pocas filas, sin paginación)
    const invitations = await prisma.invitations.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
      select: {
        id:          true,
        email:       true,
        rol:         true,
        usado:       true,
        expires_at:  true,
        created_at:  true,
      },
    })

    return NextResponse.json({ users, total, page, limit, invitations })
  } catch (err) {
    console.error('[AdminUsers] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
