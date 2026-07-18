import { NextResponse } from 'next/server'
import { withAdminApi } from '@/lib/api-route'
import { previewPublicId } from '@/lib/db'

export const GET = withAdminApi(async () => {
  const public_id = await previewPublicId('VHC')
  return NextResponse.json({ public_id })
})
