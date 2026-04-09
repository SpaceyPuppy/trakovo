'use client'
import { useState, useRef } from 'react'

interface Props {
  version: string
  buildLabel: string
  currentBuildId: string | null
  hasBackup: boolean
  backupBuildId: string | null
}

interface ReleaseInfo {
  latestVersion: string
  tag: string
  releaseName: string
  releaseUrl: string
  publishedAt: string
  upToDate: boolean
  asset: { id: number; name: string; size: number; url: string } | null
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">{title}</h3>
        {description && <p className="text-[12.5px] text-ink-3 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Spinner() {
  return <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

export default function UpdatesCard({ version, buildLabel, currentBuildId, hasBackup, backupBuildId }: Props) {
  // Current build state
  const [deployedBuildId, setDeployedBuildId] = useState(currentBuildId)
  const [backupExists, setBackupExists] = useState(hasBackup)
  const [rollbackBuildId, setRollbackBuildId] = useState(backupBuildId)

  // Check for updates
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [release, setRelease] = useState<ReleaseInfo | null>(null)

  // Pull from GitHub
  const [pulling, setPulling] = useState(false)
  const [pullMessage, setPullMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Manual upload
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Rollback
  const [rollingBack, setRollingBack] = useState(false)
  const [rollbackMessage, setRollbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  function applySuccess(buildId: string) {
    setDeployedBuildId(buildId)
    setBackupExists(true)
    // After a successful deploy the backup is the old version — we don't know its BUILD_ID from here
    // so we leave rollbackBuildId as-is (still shows previous value which is fine)
  }

  async function handleCheck() {
    setChecking(true)
    setCheckError(null)
    setRelease(null)
    setPullMessage(null)
    try {
      const res = await fetch('/api/admin/update/check')
      const data = await res.json()
      if (!res.ok) { setCheckError(data.error ?? 'Check failed'); return }
      setRelease(data)
    } catch (e: unknown) {
      setCheckError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setChecking(false)
    }
  }

  async function handlePull() {
    if (!release?.asset) return
    if (!confirm(`Pull and deploy ${release.tag} (${release.asset.name}) from GitHub?`)) return
    setPulling(true)
    setPullMessage(null)
    try {
      const res = await fetch('/api/admin/update/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: release.asset.id, assetName: release.asset.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPullMessage({ text: data.error ?? 'Pull failed', type: 'error' })
        return
      }
      applySuccess(data.buildId)
      setPullMessage({ text: `Deployed ${release.tag} — build ID: ${data.buildId}. App is restarting, refresh in a few seconds.`, type: 'success' })
      setRelease(null)
    } catch (e: unknown) {
      setPullMessage({ text: e instanceof Error ? e.message : 'Network error', type: 'error' })
    } finally {
      setPulling(false)
    }
  }

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setUploadMessage(null)
    try {
      const fd = new FormData()
      fd.append('bundle', selectedFile)
      const res = await fetch('/api/admin/update', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadMessage({ text: data.error ?? 'Upload failed', type: 'error' })
        return
      }
      applySuccess(data.buildId)
      setUploadMessage({ text: `Deployed — build ID: ${data.buildId}. App is restarting, refresh in a few seconds.`, type: 'success' })
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: unknown) {
      setUploadMessage({ text: e instanceof Error ? e.message : 'Network error', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  async function handleRollback() {
    if (!confirm('Roll back to the previous build? The current build will be replaced.')) return
    setRollingBack(true)
    setRollbackMessage(null)
    try {
      const res = await fetch('/api/admin/update/rollback', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setRollbackMessage({ text: data.error ?? 'Rollback failed', type: 'error' })
        return
      }
      setDeployedBuildId(data.buildId)
      setBackupExists(false)
      setRollbackBuildId(null)
      setRollbackMessage({ text: `Rolled back to build ${data.buildId}. App is restarting, refresh in a few seconds.`, type: 'success' })
    } catch (e: unknown) {
      setRollbackMessage({ text: e instanceof Error ? e.message : 'Network error', type: 'error' })
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <div className="max-w-[640px] space-y-6">

      {/* Current build status */}
      <Card title="Current Build">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] text-ink-4 uppercase tracking-wider font-semibold mb-0.5">App version</p>
            <p className="text-[15px] font-display font-bold text-ink">v{buildLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-ink-4 uppercase tracking-wider font-semibold mb-0.5">Build ID</p>
            <p className="text-[12.5px] font-mono text-ink">{deployedBuildId ?? 'unknown'}</p>
          </div>
        </div>
      </Card>

      {/* Check for updates / Pull from GitHub */}
      <Card title="Check for Updates" description="Pull the latest build directly from GitHub to the server — no download required.">

        {pullMessage && (
          <p className={`text-[13px] rounded-[6px] px-3 py-2 ${pullMessage.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
            {pullMessage.text}
          </p>
        )}

        {checkError && (
          <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">
            {checkError}
          </p>
        )}

        {release && (
          <div className={`rounded-[8px] border px-4 py-3 space-y-2 ${release.upToDate ? 'bg-success-bg border-success/30' : 'bg-blue-50 border-blue-200'}`}>
            {release.upToDate ? (
              <p className="text-[13px] text-success font-semibold">You are on the latest version (v{release.latestVersion ?? buildLabel})</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-blue-900">Update available — {release.releaseName}</p>
                    <p className="text-[12px] text-blue-700 mt-0.5">
                      v{buildLabel} → v{release.latestVersion} · Released {formatDate(release.publishedAt)}
                    </p>
                  </div>
                  <a
                    href={release.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-blue-600 underline underline-offset-2 whitespace-nowrap shrink-0">
                    Release notes
                  </a>
                </div>
                {release.asset ? (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handlePull}
                      disabled={pulling}
                      className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-4 py-2 rounded-[6px] transition-colors disabled:opacity-50">
                      {pulling ? <><Spinner /> Pulling…</> : 'Pull & Deploy'}
                    </button>
                    <span className="text-[12px] text-ink-4">{release.asset.name} · {formatBytes(release.asset.size)}</span>
                  </div>
                ) : (
                  <p className="text-[12.5px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-[6px] px-3 py-2 mt-1">
                    No next-bundle zip found in this release. Use manual upload below.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={handleCheck}
          disabled={checking || pulling}
          className="inline-flex items-center gap-2 border border-border text-ink-3 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-40">
          {checking ? <><Spinner /> Checking…</> : 'Check for Updates'}
        </button>
      </Card>

      {/* Manual bundle upload */}
      <Card title="Manual Deploy" description="Upload a next-bundle.zip generated locally. Use this if the server cannot reach GitHub.">

        {uploadMessage && (
          <p className={`text-[13px] rounded-[6px] px-3 py-2 ${uploadMessage.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
            {uploadMessage.text}
          </p>
        )}

        <div className="bg-bg border border-border rounded-[8px] px-4 py-3 space-y-1.5">
          <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-wider">How to create the bundle locally</p>
          <ol className="text-[12.5px] text-ink-3 space-y-1 list-decimal list-inside">
            <li><code className="font-mono text-[11.5px] bg-black/5 px-1 py-0.5 rounded">npm run build</code></li>
            <li><code className="font-mono text-[11.5px] bg-black/5 px-1 py-0.5 rounded">.\make-zip.ps1</code> — creates both the full release zip and <code className="font-mono text-[11.5px] bg-black/5 px-1 py-0.5 rounded">next-bundle-vX.X.X.zip</code></li>
            <li>Upload the <code className="font-mono text-[11.5px] bg-black/5 px-1 py-0.5 rounded">next-bundle-vX.X.X.zip</code> here</li>
          </ol>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null)
              setUploadMessage(null)
            }}
          />
          {selectedFile ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 border border-border rounded-[6px] px-3 py-2.5 bg-bg text-[13px] text-ink flex items-center gap-2">
                <span>📦</span>
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-ink-4 shrink-0">({formatBytes(selectedFile.size)})</span>
              </div>
              <button
                onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-[12px] text-ink-4 hover:text-ink px-2 py-1">✕</button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-[8px] p-6 text-center cursor-pointer hover:border-ink-3 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <p className="text-[22px] mb-1.5">📦</p>
              <p className="text-[13.5px] font-medium text-ink-3">Click to select next-bundle.zip</p>
              <p className="text-[12px] text-ink-4 mt-0.5">Must contain a .next folder with BUILD_ID</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] transition-colors disabled:opacity-40">
            {uploading ? <><Spinner /> Deploying…</> : 'Deploy'}
          </button>
          {selectedFile && !uploading && (
            <button onClick={() => fileRef.current?.click()} className="text-[13px] text-ink-3 hover:text-ink underline underline-offset-2">
              Choose different file
            </button>
          )}
        </div>
      </Card>

      {/* Rollback */}
      {backupExists && (
        <Card title="Rollback" description="Restore the build that was in place before the last deployment.">

          {rollbackMessage && (
            <p className={`text-[13px] rounded-[6px] px-3 py-2 ${rollbackMessage.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
              {rollbackMessage.text}
            </p>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] text-ink-4 uppercase tracking-wider font-semibold mb-0.5">Backup build ID</p>
              <p className="text-[12.5px] font-mono text-ink">{rollbackBuildId ?? 'unknown'}</p>
            </div>
            <button
              onClick={handleRollback}
              disabled={rollingBack}
              className="border border-red-200 text-red-600 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap">
              {rollingBack ? 'Rolling back…' : 'Roll Back'}
            </button>
          </div>
          <p className="text-[12px] text-ink-4">
            One backup is kept at a time. Deploying a new build replaces the existing backup.
          </p>
        </Card>
      )}
    </div>
  )
}
