import { NextResponse } from 'next/server'
import { readJsonObject, withAdminApi } from '@/lib/api-route'
import { getFleetCategories, parseFleetCategory, saveFleetCategory } from '@/lib/fleet-categories'

export const GET = withAdminApi(async () => NextResponse.json(await getFleetCategories()))
export const POST = withAdminApi(async request => {
  const category = parseFleetCategory(await readJsonObject(request, 4000))
  return NextResponse.json(await saveFleetCategory(category), { status: 201 })
})
