import { useCallback, useEffect, useRef, useState } from 'react'

export interface Clip {
  id: string
  content: string
  createdAt: string
}

export interface SharedFile {
  name: string
  size: number
  contentType: string
  createdAt: string
}

type WsMessage =
  | { type: 'clips_updated'; clips: Clip[] }
  | { type: 'file_updated'; file: SharedFile | null }

export function useClipboard() {
  const [clips, setClips] = useState<Clip[]>([])
  const [maxHistory, setMaxHistory] = useState(5)
  const [connected, setConnected] = useState(false)
  const [file, setFile] = useState<SharedFile | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data)
        if (msg.type === 'clips_updated') setClips(msg.clips)
        if (msg.type === 'file_updated') setFile(msg.file)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => setMaxHistory(d.maxHistory))
      .catch(() => {})

    connect()

    return () => {
      reconnectTimer.current && clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const submitClip = useCallback(async (content: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/file', { method: 'POST', body: form })
      if (res.ok) return null
      return (await res.text()) || 'Upload failed'
    } catch {
      return 'Could not reach the server'
    }
  }, [])

  return { clips, maxHistory, connected, file, submitClip, uploadFile }
}
