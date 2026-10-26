import { NextResponse } from 'next/server'
import { readJsonObject, withAdminApi } from '@/lib/api-route'
import { deleteFleetCategory, parseFleetCategory, saveFleetCategory } from '@/lib/fleet-categories'

export const PUT = withAdminApi<{ id: string }>(async (request, { params }) => {
  const category = parseFleetCategory(await readJsonObject(request, 4000))
  return NextResponse.json(await saveFleetCategory(category, params.id))
})
export const DELETE = withAdminApi<{ id: string }>(async (_request, { params }) => NextResponse.json(await deleteFleetCategory(params.id)))
