'use client'

import { useState } from 'react'
import { useNotecardStore } from '@/lib/store/notecardStore'

export default function AnalyzeButton() {
  const { documents, config, priorities, setEditorContent } = useNotecardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualNotes, setManualNotes] = useState('')
  const [showManual, setShowManual] = useState(false)

  const analyze = async () => {
    if (!documents.length && !manualNotes.trim()) {
      setError('Upload files or enter notes first.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, config, priorities, manualNotes }),
      })

      if (!res.ok || !res.body) throw new Error(await res.text())

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let frontContent = ''
      let backContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse complete lines as JSON sections
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('{')) continue
          try {
            const section = JSON.parse(trimmed)
            const text = `\n**${section.label}**\n${section.content}\n`
            if (section.side === 'back') {
              backContent += text
            } else {
              frontContent += text
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      if (frontContent) {
        setEditorContent('front', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: frontContent }] }] })
      }
      if (backContent) {
        setEditorContent('back', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: backContent }] }] })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowManual(!showManual)}
        className="text-xs text-indigo-400 hover:text-indigo-300 text-left"
      >
        {showManual ? '▾' : '▸'} Add manual notes
      </button>

      {showManual && (
        <textarea
          value={manualNotes}
          onChange={(e) => setManualNotes(e.target.value)}
          placeholder="Type any notes, topics, or formulas you want included..."
          className="bg-gray-800 text-gray-200 rounded-lg p-3 text-xs resize-none h-28 border border-gray-600 focus:border-indigo-500 outline-none"
        />
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 rounded p-2">{error}</p>
      )}

      <button
        onClick={analyze}
        disabled={loading}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          loading
            ? 'bg-indigo-800 text-indigo-300 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          '✨ Fill Notecard with AI'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Claude will extract key formulas and concepts
      </p>
    </div>
  )
}
