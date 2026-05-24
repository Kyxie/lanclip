import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clipboard, Copy, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard, type Clip } from '@/hooks/useClipboard'
import { cn, relativeTime } from '@/lib/utils'

export default function App() {
  const { clips, connected, submitClip } = useClipboard()

  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const content = draft.trim()
    if (!content || saving) return
    setSaving(true)
    const ok = await submitClip(content)
    setSaving(false)
    if (ok) {
      setDraft('')
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
        <div className="flex h-[15rem] flex-col rounded-xl border-[1.5px] border-dashed border-stripe-border bg-white p-4 transition-colors duration-200 ease-out hover:border-stripe-muted focus-within:border-solid focus-within:border-stripe-text">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste or type something…"
            className="min-h-0 flex-1 border-0 p-0 shadow-none focus:ring-0 text-[14px] leading-relaxed"
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
        {clips.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stripe-muted">
              History
            </p>
            <div className="flex flex-col gap-2">
              {clips.map((clip) => (
                <HistoryCard
                  key={clip.id}
                  clip={clip}
                  expanded={expandedId === clip.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === clip.id ? null : clip.id))
                  }
                  onCollapse={() => setExpandedId(null)}
                />
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
      // Fallback for plain HTTP on LAN where navigator.clipboard is unavailable
      try {
        const el = document.createElement('textarea')
        el.value = text
        Object.assign(el.style, { position: 'fixed', top: '0', opacity: '0' })
        document.body.appendChild(el)
        el.focus()
        el.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(el)
        if (ok) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      } catch {
        // nothing we can do
      }
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

function HistoryCard({
  clip,
  expanded,
  onToggle,
  onCollapse,
}: {
  clip: Clip
  expanded: boolean
  onToggle: () => void
  onCollapse: () => void
}) {
  const [, setTick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCollapse()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded, onCollapse])

  return (
    <div
      ref={ref}
      onClick={onToggle}
      className={cn(
        'relative flex cursor-pointer items-start justify-between gap-4 rounded-xl border-[1.5px] bg-white px-4 py-3 transition-all duration-300 ease-out',
        expanded
          ? 'max-h-[15rem] overflow-y-auto border-solid border-stripe-text'
          : 'max-h-[5.5rem] overflow-hidden border-dashed border-stripe-border hover:border-stripe-muted',
      )}
    >
      <p className="flex-1 text-[13px] leading-relaxed text-stripe-text whitespace-pre-wrap break-words">
        {clip.content}
      </p>
      <div className="sticky top-0 flex shrink-0 flex-col items-end gap-2 self-start pt-0.5">
        <span className="text-[11px] text-stripe-muted tabular-nums">
          {relativeTime(new Date(clip.createdAt))}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton text={clip.content} />
        </div>
      </div>
      {!expanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white to-transparent" />
      )}
    </div>
  )
}
