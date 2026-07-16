import { execute, query, queryOne } from './db'

interface SettingRow {
  key: string
  value: string
}

export type SettingsMap = Record<string, string>

function rowsToSettings(rows: SettingRow[]): SettingsMap {
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]))
}

/** Load all settings, or a selected set of keys, in one database round trip. */
export async function getSettings(keys?: readonly string[]): Promise<SettingsMap> {
  if (keys?.length === 0) return {}

  if (!keys) {
    return rowsToSettings(await query<SettingRow>('SELECT `key`, value FROM Setting'))
  }

  const placeholders = keys.map(() => '?').join(', ')
  const rows = await query<SettingRow>(
    `SELECT \`key\`, value FROM Setting WHERE \`key\` IN (${placeholders})`,
    [...keys]
  )
  return rowsToSettings(rows)
}

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM Setting WHERE `key` = ? LIMIT 1',
    [key]
  )
  return row?.value
}

/** Upsert a group of settings with one statement instead of one query per key. */
export async function upsertSettings(entries: ReadonlyArray<readonly [string, string]>): Promise<void> {
  if (entries.length === 0) return

  const valuePlaceholders = entries.map(() => '(?, ?, NOW())').join(', ')
  const params = entries.flatMap(([key, value]) => [key, value])
  await execute(
    `INSERT INTO Setting (\`key\`, value, updated_at) VALUES ${valuePlaceholders}
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
    params
  )
}
