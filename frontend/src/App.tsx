import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clipboard, Copy, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard, type Clip } from '@/hooks/useClipboard'
import { cn, relativeTime } from '@/lib/utils'

export default function App() {
  const { clips, maxHistory, connected, submitClip } = useClipboard()

  const currentClip = clips[0] ?? null
  const history = clips.slice(1)

  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // Tracks the last content that came from the server.
  // When a new clip arrives, we only overwrite the textarea if the user
  // hasn't changed it from the previous server value (i.e., they haven't
  // started composing something new).
  const serverContentRef = useRef('')

  useEffect(() => {
    if (!currentClip) return
    const incoming = currentClip.content
    setDraft((prev) => {
      if (prev === serverContentRef.current || prev === '') {
        return incoming
      }
      return prev
    })
    serverContentRef.current = incoming
  }, [currentClip?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    const content = draft.trim()
    if (!content || saving) return
    setSaving(true)
    const ok = await submitClip(content)
    setSaving(false)
    if (ok) {
      // Mark current draft as "from server" so the WS echo doesn't get blocked
      serverContentRef.current = content
    }
  }, [draft, saving, submitClip])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  return (
    <div className="min-h-screen bg-stripe-bg">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-stripe-text" strokeWidth={1.5} />
            <span className="text-[15px] font-semibold text-stripe-text tracking-tight">
              LAN Clip
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                <span className="text-emerald-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-400" strokeWidth={2} />
                <span className="text-red-500">Reconnecting…</span>
              </>
            )}
          </div>
        </div>

        {/* Current clip editor */}
        <div className="rounded border border-stripe-border bg-white p-4 shadow-sm">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste or type something…"
            rows={6}
            className="border-0 p-0 shadow-none focus:ring-0 text-[14px] leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between border-t border-stripe-border pt-3">
            <span className="text-[11px] text-stripe-muted select-none">
              {draft.length > 0 ? `${draft.length} chars` : 'Ctrl+Enter to save'}
            </span>
            <div className="flex items-center gap-2">
              <CopyButton text={draft} />
              <Button
                onClick={handleSave}
                disabled={!draft.trim() || saving}
                size="sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {/* History */}
        {maxHistory > 1 && history.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stripe-muted">
              History
            </p>
            <div className="flex flex-col gap-2">
              {history.map((clip) => (
                <HistoryCard key={clip.id} clip={clip} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API may be unavailable over plain HTTP on some browsers
    }
  }, [text])

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} disabled={!text.trim()}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
      )}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

function HistoryCard({ clip }: { clip: Clip }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const preview =
    clip.content.length > 200 ? clip.content.slice(0, 200) + '…' : clip.content

  return (
    <div className="flex items-start justify-between gap-4 rounded border border-stripe-border bg-white px-4 py-3 shadow-sm">
      <p
        className={cn(
          'flex-1 text-[13px] leading-relaxed text-stripe-text whitespace-pre-wrap break-words',
          clip.content.length > 200 && 'line-clamp-3',
        )}
      >
        {preview}
      </p>
      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
        <span className="text-[11px] text-stripe-muted tabular-nums">
          {relativeTime(new Date(clip.createdAt))}
        </span>
        <CopyButton text={clip.content} />
      </div>
    </div>
  )
}
