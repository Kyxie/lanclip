import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clipboard, Copy, Download, FileUp, Upload, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard, type Clip, type SharedFile } from '@/hooks/useClipboard'
import { cn, relativeTime } from '@/lib/utils'

export default function App() {
  const { clips, connected, file, submitClip, uploadFile, deleteClip, clearFile } = useClipboard()
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [draggingFile, setDraggingFile] = useState(false)
  const dragDepth = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = useCallback(async () => {
    const content = draft.trim()
    if (!content || saving) return
    setSaving(true)
    const ok = await submitClip(content)
    setSaving(false)
    if (ok) setDraft('')
  }, [draft, saving, submitClip])

  const handleFile = useCallback(async (selectedFile: File) => {
    if (uploading) return
    if (selectedFile.size > 100 * 1024 * 1024) {
      setUploadError('File must be 100 MiB or smaller')
      return
    }
    setUploadError('')
    setUploading(true)
    const error = await uploadFile(selectedFile)
    setUploading(false)
    if (error) setUploadError(error)
  }, [uploadFile, uploading])

  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setDraggingFile(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDraggingFile(false)
    }
  }
  const handleDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setDraggingFile(false)
    const dropped = e.dataTransfer.files.item(0)
    if (dropped) void handleFile(dropped)
  }
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSave()
    }
  }, [handleSave])

  return (
    <div className="min-h-screen bg-stripe-bg">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-stripe-text" strokeWidth={1.5} />
            <span className="text-[15px] font-semibold tracking-tight text-stripe-text">LAN Clip</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            {connected ? <><Wifi className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} /><span className="text-emerald-600">Live</span></> : <><WifiOff className="h-3.5 w-3.5 text-red-400" strokeWidth={2} /><span className="text-red-500">Reconnecting…</span></>}
          </div>
        </div>

        <div onDragEnter={handleDragEnter} onDragOver={(e) => isFileDrag(e) && e.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn('relative flex h-[15rem] flex-col rounded-xl border-[1.5px] border-dashed border-stripe-border bg-white p-4 transition-colors duration-200 ease-out hover:border-solid hover:border-stripe-muted focus-within:border-solid focus-within:border-stripe-text', draggingFile && 'border-solid border-stripe-text bg-stripe-bg')}>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder="Paste or type something…" className="min-h-0 flex-1 border-0 p-0 text-[14px] leading-relaxed shadow-none focus:ring-0" />
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-stripe-border pt-3">
            <span className="text-[11px] text-stripe-muted select-none">{uploading ? 'Uploading file…' : draggingFile ? 'Drop to upload (max 100 MiB)' : draft.length > 0 ? `${draft.length} chars` : 'Ctrl+Enter to save · Drag a file here'}</span>
            <div className="flex shrink-0 items-center gap-2">
              <input ref={fileInputRef} type="file" className="sr-only" onChange={(e) => { const selected = e.target.files?.item(0); if (selected) void handleFile(selected); e.currentTarget.value = '' }} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="h-3.5 w-3.5" strokeWidth={1.5} />File</Button>
              <CopyButton text={draft} />
              <Button onClick={() => void handleSave()} disabled={!draft.trim() || saving} size="sm">{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
          {uploadError && <p className="mt-2 text-[11px] text-red-500">{uploadError}</p>}
        </div>

        {file && <section className="mt-8"><SectionTitle>File</SectionTitle><FileCard file={file} onDelete={() => void clearFile()} /></section>}
        {clips.length > 0 && <section className="mt-8"><SectionTitle>Text</SectionTitle><div className="flex flex-col gap-2">{clips.map((clip) => <HistoryCard key={clip.id} clip={clip} expanded={expandedId === clip.id} onToggle={() => setExpandedId((prev) => prev === clip.id ? null : clip.id)} onCollapse={() => setExpandedId(null)} onDelete={() => void deleteClip(clip.id)} />)}</div></section>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stripe-muted">{children}</p>
}

function FileCard({ file, onDelete }: { file: SharedFile; onDelete: () => void }) {
  const { deleteMode, handlers } = useLongPressDelete(() => {}, onDelete)
  return <div {...handlers} className={cn('flex min-h-[5.5rem] cursor-pointer items-center justify-between gap-4 rounded-xl border-[1.5px] bg-white px-4 py-3 transition-colors duration-200 ease-out hover:border-solid hover:border-stripe-muted', deleteMode ? 'border-solid border-red-500 bg-red-50' : 'border-dashed border-stripe-border')}>
    {deleteMode ? <DeleteLabel /> : <><div className="flex min-w-0 items-center gap-3"><FileUp className="h-4 w-4 shrink-0 text-stripe-muted" strokeWidth={1.5} /><div className="min-w-0"><p className="truncate text-[13px] font-medium text-stripe-text">{file.name}</p><p className="text-[11px] text-stripe-muted">{formatFileSize(file.size)} · {relativeTime(new Date(file.createdAt))}</p></div></div><a href="/api/file" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded border border-stripe-border bg-white px-3 text-[13px] font-medium text-stripe-text transition-colors hover:bg-stripe-bg active:bg-[#eef2f7]"><Download className="h-3.5 w-3.5" strokeWidth={1.5} />Download</a></>}
  </div>
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KiB`
  return `${(size / (1024 * 1024)).toFixed(1)} MiB`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    if (!text.trim()) return
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {
      const el = document.createElement('textarea')
      el.value = text
      Object.assign(el.style, { position: 'fixed', top: '0', opacity: '0' })
      document.body.appendChild(el); el.focus(); el.select()
      if (document.execCommand('copy')) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
      document.body.removeChild(el)
    }
  }, [text])
  return <Button variant="outline" size="sm" onClick={handleCopy} disabled={!text.trim()}>{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}{copied ? 'Copied' : 'Copy'}</Button>
}

function HistoryCard({ clip, expanded, onToggle, onCollapse, onDelete }: { clip: Clip; expanded: boolean; onToggle: () => void; onCollapse: () => void; onDelete: () => void }) {
  const [, setTick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { deleteMode, handlers } = useLongPressDelete(onToggle, onDelete)
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 30_000); return () => clearInterval(id) }, [])
  useEffect(() => { if (!expanded) return; const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCollapse() }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler) }, [expanded, onCollapse])
  return <div ref={ref} {...handlers} className={cn('relative flex cursor-pointer items-start justify-between gap-4 rounded-xl border-[1.5px] bg-white px-4 py-3 transition-all duration-300 ease-out', deleteMode ? 'min-h-[5.5rem] items-center justify-center border-solid border-red-500 bg-red-50' : expanded ? 'max-h-[15rem] overflow-y-auto border-solid border-stripe-text' : 'max-h-[5.5rem] overflow-hidden border-dashed border-stripe-border hover:border-stripe-muted')}>
    {deleteMode ? <DeleteLabel /> : <><p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-stripe-text">{clip.content}</p><div className="sticky top-0 flex w-[6.5rem] shrink-0 flex-col items-end gap-2 self-start pt-0.5"><span className="text-[11px] tabular-nums text-stripe-muted">{relativeTime(new Date(clip.createdAt))}</span><div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}><CopyButton text={clip.content} /></div></div>{!expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white to-transparent" />}</>}
  </div>
}

function DeleteLabel() { return <p className="text-lg font-semibold tracking-[0.3em] text-red-600">DELETE</p> }

function useLongPressDelete(onActivate: () => void, onDelete: () => void) {
  const [deleteMode, setDeleteMode] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreClick = useRef(false)
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => clearTimer, [])
  return { deleteMode, handlers: {
    onPointerDown: () => { if (!deleteMode) timer.current = setTimeout(() => { ignoreClick.current = true; setDeleteMode(true) }, 500) },
    onPointerUp: clearTimer,
    onPointerLeave: clearTimer,
    onPointerCancel: clearTimer,
    onContextMenu: (e: React.MouseEvent) => { if (deleteMode) e.preventDefault() },
    onClick: () => { if (ignoreClick.current) { ignoreClick.current = false; return }; if (deleteMode) onDelete(); else onActivate() },
  } }
}
