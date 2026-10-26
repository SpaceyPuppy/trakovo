import { NextResponse } from 'next/server'
import { readJsonObject, withAdminApi } from '@/lib/api-route'
import { saveServiceCategoryAssignments } from '@/lib/service-category-settings'

export const PUT = withAdminApi(async request =>
  NextResponse.json(await saveServiceCategoryAssignments(await readJsonObject(request, 4000)))
)
