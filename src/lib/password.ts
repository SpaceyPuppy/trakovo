// Node.js runtime only — never import this from middleware or Edge code
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${buf.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':')
    const buf = (await scryptAsync(password, salt, 64)) as Buffer
    return timingSafeEqual(buf, Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}
