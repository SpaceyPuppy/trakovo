import { NextResponse } from 'next/server'
import { readJsonObject, withAdminApi } from '@/lib/api-route'
import { deleteVehicle, parseVehicleInput, updateVehicle } from '@/lib/vehicle-admin'

interface Params { id: string }

export const PUT = withAdminApi<Params>(async (request, { params }) => {
  const body = await readJsonObject(request)
  const vehicle = await updateVehicle(params.id, parseVehicleInput(body, false))
  return NextResponse.json(vehicle)
})

export const DELETE = withAdminApi<Params>(async (_request, { params }) => {
  return NextResponse.json(await deleteVehicle(params.id))
})
