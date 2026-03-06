import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function generatePublicId(
  prefix: 'VHB' | 'VHC' | 'VND' | 'VNC' | 'VNE' | 'DRV'
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    let count: number
    if (prefix === 'VHB') count = await tx.booking.count()
    else if (prefix === 'VHC') count = await tx.vehicle.count()
    else if (prefix === 'VND') count = await tx.vendor.count()
    else if (prefix === 'VNC') count = await tx.vendorClient.count()
    else if (prefix === 'DRV') count = await tx.driver.count()
    else count = await tx.vendorEnquiry.count()
    return `${prefix}-${String(count + 1).padStart(4, '0')}`
  })
}
