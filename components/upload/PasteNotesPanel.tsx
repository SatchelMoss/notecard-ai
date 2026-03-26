'use client'

import { useState } from 'react'
import { parsePastedNotes } from '@/lib/parsing/pasteParser'
import { useNotecardStore } from '@/lib/store/notecardStore'

export default function PasteNotesPanel() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ lines: number; sections: number } | null>(null)
  const { setPendingHtml } = useNotecardStore()

  const handleFormat = () => {
    if (!text.trim()) return
    const result = parsePastedNotes(text)
    setPendingHtml(result.html)
    setStatus({ lines: result.lineCount, sections: result.sectionCount })
  }

  const handleClear = () => {
    setText('')
    setStatus(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Paste Notes
        </h2>
        {text && (
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-gray-300">
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Copy your notesheet from Claude or ChatGPT and paste it here. Equations, subscripts, and formatting will be preserved.
      </p>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setStatus(null) }}
        placeholder="Paste your LLM-generated notesheet here..."
        className="bg-gray-800 text-gray-200 rounded-lg p-3 text-xs resize-none h-48 border border-gray-700 focus:border-indigo-500 outline-none font-mono leading-relaxed"
        spellCheck={false}
      />

      {status && (
        <p className="text-xs text-green-400 bg-green-950/30 rounded px-2 py-1.5">
          ✓ Loaded {status.lines} lines across {status.sections} section{status.sections !== 1 ? 's' : ''}
        </p>
      )}

      <button
        onClick={handleFormat}
        disabled={!text.trim()}
        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          text.trim()
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        Format onto Notecard
      </button>
    </div>
  )
}
